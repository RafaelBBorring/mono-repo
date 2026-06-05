import json
import re
from typing import Any, Dict, List, Optional

import httpx
from loguru import logger

from config import settings
from fusion.decision_engine import decision_engine, FusionResult
from agents.base_agent import AgentResult
from models import ClassificationStatus

SYSTEM_PROMPT = """Voce e um classificador de surfistas em videos de surf. Sua tarefa e analisar as caracteristicas extraidas por 4 agentes de IA de um video e comparar com as pastas de surfistas ja cadastrados.

Os agentes analisaram:
- ROSTO: cabelo, barba, tom de pele
- ROUPA: cores predominantes do torso com porcentagens
- PRANCHA: cores e caracteristicas da prancha
- POSTURA: estilo de surf, posicao do corpo

Responda EXATAMENTE no formato JSON abaixo, sem markdown:
{
  "matched_folder": "nome exato da pasta" ou null,
  "matched_folder_id": "id da pasta" ou null,
  "confidence": 0.0 a 1.0,
  "reasoning": "explicacao breve em portugues",
  "create_new": true ou false,
  "key_factors": ["fator1", "fator2"]
}

Regras:
- Compare TODOS os atributos, nao apenas um. Mesmo que a roupa seja parecida, verifique rosto, prancha e postura.
- Se nao houver pastas, responda create_new=true.
- Se houver correspondencia forte (acima de 70%), atribua a pasta existente.
- Se houver correspondencia fraca (40-70%), indique create_new=false mas com confidence baixo.
- Se nao houver correspondencia (abaixo de 40%), indique create_new=true.
- Considere que videos do mesmo surfista podem ter angulos diferentes, mas cores de roupa e prancha tendem a ser iguais."""

PHASE2_PROMPT = """Voce e um classificador de surfistas fazendo uma ANALISE PROFUNDA (segunda fase).

O video foi comparado com as pastas abaixo mas a confianca ficou abaixo de 40%. Agora voce tem dados mais detalhados dos videos de referencia das pastas candidatas.

Analise cuidadosamente cada atributo e compare:
- Se a roupa, prancha e caracteristicas fisicas sao compativeis
- Considere que angulos diferentes podem mudar a percepcao

Responda EXATAMENTE no formato JSON abaixo, sem markdown:
{
  "matched_folder": "nome exato da pasta" ou null,
  "matched_folder_id": "id da pasta" ou null,
  "confidence": 0.0 a 1.0,
  "reasoning": "explicacao detalhada em portugues",
  "is_new_surfer": true ou false
}

Se a confianca ficar abaixo de 60%, is_new_surfer sera true ou o video sera nao-classificado."""


async def _call_openrouter(messages: List[dict], temperature: float = 0.3) -> Optional[str]:
    if not settings.OPENROUTER_API_KEY:
        return None

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code != 200:
                logger.warning("[AIFusion] OpenRouter error %d: %s", resp.status_code, resp.text[:200])
                return None
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return content.strip()
    except Exception as e:
        logger.warning("[AIFusion] OpenRouter call failed: %s", e)
        return None


def _parse_json_response(text: str) -> Optional[dict]:
    if not text:
        return None
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def _build_video_report(agent_results: List[AgentResult]) -> str:
    lines = []
    for r in agent_results:
        agent_label = {
            "FaceAgent": "ROSTO",
            "PoseAgent": "POSTURA",
            "BoardAgent": "PRANCHA",
            "ClothingAgent": "ROUPA",
        }.get(r.agent_name, r.agent_name)

        if r.error:
            lines.append(f"- {agent_label}: nao detectado ({r.error})")
        elif r.description:
            lines.append(f"- {agent_label}: {r.description}")
        else:
            lines.append(f"- {agent_label}: sinal detectado, confianca {r.confidence:.0%}")

    return "\n".join(lines)


def _build_folder_list(folder_descriptors: Dict[str, dict]) -> str:
    if not folder_descriptors:
        return "Nenhuma pasta cadastrada."

    lines = []
    for fid, desc in folder_descriptors.items():
        name = desc.get("name", f"Surfista {fid[:8]}")
        descriptor = desc.get("descriptor", {})
        if isinstance(descriptor, dict) and descriptor:
            detail_parts = []
            for key, val in descriptor.items():
                if val and val != "nao detectado" and val != "sem cores detectadas":
                    detail_parts.append(f"{key}: {val}")
            if detail_parts:
                lines.append(f"- **{name}** (id: {fid[:8]}...): {'; '.join(detail_parts)}")
            else:
                lines.append(f"- **{name}** (id: {fid[:8]}...): sem descricao detalhada")
        else:
            lines.append(f"- **{name}** (id: {fid[:8]}...): sem descricao")

    return "\n".join(lines)


async def phase1_classify(
    agent_results: List[AgentResult],
    folder_descriptors: Dict[str, dict],
) -> Optional[dict]:
    video_report = _build_video_report(agent_results)
    folder_list = _build_folder_list(folder_descriptors)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"## Relatorio do Video\n{video_report}\n\n## Pastas Existentes\n{folder_list}\n\nClassifique este video."},
    ]

    logger.info("[AIFusion] Phase 1: sending to OpenRouter...")
    response_text = await _call_openrouter(messages)
    if not response_text:
        logger.info("[AIFusion] Phase 1: OpenRouter unavailable, using fallback")
        return None

    parsed = _parse_json_response(response_text)
    if not parsed:
        logger.warning("[AIFusion] Phase 1: could not parse response: %s", response_text[:200])
        return None

    logger.info("[AIFusion] Phase 1 result: match=%s confidence=%.2f create_new=%s",
                parsed.get("matched_folder"), parsed.get("confidence", 0), parsed.get("create_new"))
    parsed["_phase"] = 1
    parsed["_raw_response"] = response_text
    return parsed


async def phase2_deep_compare(
    agent_results: List[AgentResult],
    candidate_folders: Dict[str, dict],
) -> Optional[dict]:
    video_report = _build_video_report(agent_results)

    candidate_details = []
    for fid, desc in candidate_folders.items():
        name = desc.get("name", f"Surfista {fid[:8]}")
        descriptor = desc.get("descriptor", {})
        videos = desc.get("video_descriptions", [])
        detail = f"**{name}** (id: {fid[:8]}...)\n"
        if isinstance(descriptor, dict):
            for k, v in descriptor.items():
                if v:
                    detail += f"  - {k}: {v}\n"
        if videos:
            detail += f"  - Videos na pasta: {len(videos)}\n"
            for i, vd in enumerate(videos[:2]):
                detail += f"  - Video ref {i+1}: {vd}\n"
        candidate_details.append(detail)

    candidates_text = "\n".join(candidate_details)

    messages = [
        {"role": "system", "content": PHASE2_PROMPT},
        {"role": "user", "content": f"## Relatorio do Video\n{video_report}\n\n## Pastas Candidatas\n{candidates_text}\n\nFaca uma analise profunda e classifique."},
    ]

    logger.info("[AIFusion] Phase 2: deep compare with %d candidates", len(candidate_folders))
    response_text = await _call_openrouter(messages, temperature=0.2)
    if not response_text:
        return None

    parsed = _parse_json_response(response_text)
    if not parsed:
        logger.warning("[AIFusion] Phase 2: could not parse response: %s", response_text[:200])
        return None

    logger.info("[AIFusion] Phase 2 result: match=%s confidence=%.2f is_new=%s",
                parsed.get("matched_folder"), parsed.get("confidence", 0), parsed.get("is_new_surfer"))
    parsed["_phase"] = 2
    parsed["_raw_response"] = response_text
    return parsed


def fallback_classify(agent_results: List[AgentResult]) -> FusionResult:
    return decision_engine.fuse(agent_results)
