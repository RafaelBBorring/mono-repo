"""
Poseidon Pipeline Debug Tool

Run: cd backend && python -m debug_pipeline

Tests the full classification pipeline with synthetic data
to validate agents, AI fusion, and result writing.
"""

import asyncio
import sys
import os
import json
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from agents.base_agent import AgentResult
from services.ai_fusion import phase1_classify, phase2_deep_compare, fallback_classify, _call_openrouter


def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_result(name, ok, detail=""):
    status = "[PASS]" if ok else "[FAIL]"
    print(f"  {status} — {name}")
    if detail:
        print(f"         {detail}")


async def run_tests():
    print_header("POSEIDON PIPELINE DEBUG")
    print(f"  OpenRouter Key: {'SET' if settings.OPENROUTER_API_KEY else 'MISSING'}")
    print(f"  Model: {settings.OPENROUTER_MODEL}")
    print(f"  Base URL: {settings.OPENROUTER_BASE_URL}")
    print(f"  DB: {settings.DATABASE_URL}")
    print(f"  Phase1 Threshold: {settings.PHASE1_THRESHOLD}")
    print(f"  Phase2 Threshold: {settings.PHASE2_THRESHOLD}")

    total = 0
    passed = 0

    # ── Test 1: Config Loading ─────────────────────────────────────────
    print_header("1. CONFIG")
    total += 1
    has_key = bool(settings.OPENROUTER_API_KEY)
    if has_key:
        passed += 1
        print_result("OPENROUTER_API_KEY loaded", True)
    else:
        print_result("OPENROUTER_API_KEY loaded", False, "Key is empty — check .env path")

    # ── Test 2: Imports ────────────────────────────────────────────────
    print_header("2. IMPORTS")
    imports_ok = True
    try:
        from services.ai_fusion import phase1_classify
        print_result("ai_fusion import", True)
    except Exception as e:
        print_result("ai_fusion import", False, str(e))
        imports_ok = False

    try:
        from services.classify_pipeline import classification_pipeline
        print_result("classify_pipeline import", True)
    except Exception as e:
        print_result("classify_pipeline import", False, str(e))
        imports_ok = False

    try:
        from agents.face_agent import FaceAgent
        from agents.clothing_agent import ClothingAgent
        from agents.board_agent import BoardAgent
        from agents.pose_agent import PoseAgent
        print_result("All 4 agents import", True)
    except Exception as e:
        print_result("All 4 agents import", False, str(e))
        imports_ok = False

    try:
        from utils.color_descriptions import extract_dominant_colors, rgb_to_color_name, describe_face
        print_result("color_descriptions import", True)
    except Exception as e:
        print_result("color_descriptions import", False, str(e))
        imports_ok = False

    total += 1
    if imports_ok:
        passed += 1

    # ── Test 3: OpenRouter Connectivity ────────────────────────────────
    print_header("3. OPENROUTER CONNECTIVITY")
    total += 1
    try:
        resp = await _call_openrouter([
            {"role": "user", "content": "Responda apenas: OK"}
        ])
        if resp:
            passed += 1
            print_result("OpenRouter API call", True, f"Response: {resp[:80]}")
        else:
            print_result("OpenRouter API call", False, "Got empty response")
    except Exception as e:
        print_result("OpenRouter API call", False, str(e))

    # ── Test 4: Phase 1 Classification ────────────────────────────────
    print_header("4. PHASE 1 CLASSIFICATION (match existing)")
    total += 1
    try:
        agent_results = [
            AgentResult(agent_name="FaceAgent", surfist_id=None, confidence=0.6,
                        description="cabelo castanho escuro 78%; barba densa 35%; pele morena clara"),
            AgentResult(agent_name="ClothingAgent", surfist_id=None, confidence=0.7,
                        description="roupa: preto 89%, cinza escuro 3%, branco 8%"),
            AgentResult(agent_name="BoardAgent", surfist_id=None, confidence=0.8,
                        description="prancha: branco 70%, amarelo 15%"),
            AgentResult(agent_name="PoseAgent", surfist_id=None, confidence=0.5,
                        description="corpo proporcional; joelhos semiflexionados; bracos estendidos"),
        ]
        folder_descriptors = {
            "surf-001": {
                "name": "Surfista 1", "display_id": 1,
                "descriptor": {
                    "rosto": "cabelo loiro 90%; sem barba; pele clara",
                    "roupa": "preto 75%, azul 15%",
                    "prancha": "amarelo 80%",
                    "postura": "agachado; bracos abertos",
                },
            },
            "surf-002": {
                "name": "Surfista 2", "display_id": 2,
                "descriptor": {
                    "rosto": "cabelo castanho 85%; barba 30%; pele morena",
                    "roupa": "preto 90%, cinza 5%",
                    "prancha": "branco 75%, amarelo 10%",
                    "postura": "corpo largo; pernas esticadas",
                },
            },
        }

        result = await phase1_classify(agent_results, folder_descriptors)
        if result:
            passed += 1
            print_result("Phase 1 returned result", True,
                f"match={result.get('matched_folder')} confidence={result.get('confidence')} create_new={result.get('create_new')}")
            print(f"         Reasoning: {result.get('reasoning', '')[:100]}")
        else:
            print_result("Phase 1 returned result", False, "Got None")
    except Exception as e:
        print_result("Phase 1 classification", False, str(e))

    # ── Test 5: Phase 1 — No Match (new surfer) ───────────────────────
    print_header("5. PHASE 1 CLASSIFICATION (new surfer)")
    total += 1
    try:
        agent_results_new = [
            AgentResult(agent_name="FaceAgent", surfist_id=None, confidence=0.3,
                        description="cabelo ruivo 80%; sardas; pele clara"),
            AgentResult(agent_name="ClothingAgent", surfist_id=None, confidence=0.4,
                        description="roupa: verde 60%, branco 30%"),
            AgentResult(agent_name="BoardAgent", surfist_id=None, confidence=0.5,
                        description="prancha: preto 80%, rosa 10%"),
            AgentResult(agent_name="PoseAgent", surfist_id=None, confidence=0.3,
                        description="corpo estreito; pernas esticadas; bracos recolhidos"),
        ]

        result = await phase1_classify(agent_results_new, folder_descriptors)
        if result:
            passed += 1
            print_result("Phase 1 new surfer", True,
                f"create_new={result.get('create_new')} confidence={result.get('confidence')}")
            print(f"         Reasoning: {result.get('reasoning', '')[:100]}")
        else:
            print_result("Phase 1 new surfer", False, "Got None")
    except Exception as e:
        print_result("Phase 1 new surfer", False, str(e))

    # ── Test 6: Phase 2 Deep Compare ──────────────────────────────────
    print_header("6. PHASE 2 DEEP COMPARE")
    total += 1
    try:
        candidates = {
            "surf-001": {
                "name": "Surfista 1", "display_id": 1,
                "descriptor": folder_descriptors["surf-001"]["descriptor"],
                "video_descriptions": ["rosto: cabelo loiro; sem barba; roupa: preto 75%; prancha: amarelo"],
            },
            "surf-002": {
                "name": "Surfista 2", "display_id": 2,
                "descriptor": folder_descriptors["surf-002"]["descriptor"],
                "video_descriptions": ["rosto: cabelo castanho; barba leve; roupa: preto 90%; prancha: branco"],
            },
        }

        result = await phase2_deep_compare(agent_results, candidates)
        if result:
            passed += 1
            print_result("Phase 2 deep compare", True,
                f"match={result.get('matched_folder')} confidence={result.get('confidence')} is_new={result.get('is_new_surfer')}")
            print(f"         Reasoning: {result.get('reasoning', '')[:100]}")
        else:
            print_result("Phase 2 deep compare", False, "Got None")
    except Exception as e:
        print_result("Phase 2 deep compare", False, str(e))

    # ── Test 7: Fallback Classification ───────────────────────────────
    print_header("7. FALLBACK (cosine similarity)")
    total += 1
    try:
        agent_results_emb = [
            AgentResult(agent_name="FaceAgent", surfist_id="surf-002", confidence=0.72,
                        embedding=np.random.randn(512).astype(np.float32),
                        description="cabelo castanho; barba 30%"),
            AgentResult(agent_name="PoseAgent", surfist_id="surf-002", confidence=0.65,
                        embedding=np.random.randn(20).astype(np.float32),
                        description="corpo proporcional"),
            AgentResult(agent_name="BoardAgent", surfist_id="surf-001", confidence=0.45,
                        embedding=np.random.randn(160).astype(np.float32),
                        description="prancha: branco 70%"),
            AgentResult(agent_name="ClothingAgent", surfist_id="surf-002", confidence=0.80,
                        embedding=np.random.randn(122).astype(np.float32),
                        description="roupa: preto 89%"),
        ]

        fusion = fallback_classify(agent_results_emb)
        passed += 1
        print_result("Fallback classification", True,
            f"status={fusion.status.value} confidence={fusion.final_confidence:.2f} surfist={fusion.surfist_id}")
    except Exception as e:
        print_result("Fallback classification", False, str(e))

    # ── Test 8: Agent Description Generation ──────────────────────────
    print_header("8. AGENT DESCRIPTIONS")
    total += 1
    desc_ok = True
    try:
        from utils.color_descriptions import rgb_to_color_name, extract_dominant_colors

        tests = [(0,0,0,"preto"), (255,255,255,"branco"), (255,0,0,"vermelho"),
                 (0,128,0,"verde"), (0,0,255,"azul"), (139,69,19,"marrom")]
        for r, g, b, expected in tests:
            result = rgb_to_color_name(r, g, b)
            ok = result == expected
            if not ok:
                print_result(f"rgb({r},{g},{b}) = {result} (expected {expected})", False)
                desc_ok = False

        fake_img = np.zeros((100, 100, 3), dtype=np.uint8)
        fake_img[30:70, 20:80] = [0, 0, 200]
        colors = extract_dominant_colors(fake_img)
        if colors:
            print_result("extract_dominant_colors", True, f"Found: {[(n,p) for n,p,_ in colors]}")
        else:
            print_result("extract_dominant_colors", False, "No colors extracted")
            desc_ok = False

        if desc_ok:
            passed += 1
    except Exception as e:
        print_result("Color descriptions", False, str(e))

    # ── Test 9: Database + Models ─────────────────────────────────────
    print_header("9. DATABASE + MODELS")
    total += 1
    try:
        from database import init_db, async_session_factory
        from models import Surfist, Video

        await init_db()
        print_result("init_db()", True)

        async with async_session_factory() as db:
            from sqlalchemy import select
            result = await db.execute(select(Surfist))
            surfists = result.scalars().all()
            print_result(f"Surfist table readable ({len(surfists)} rows)", True)

            result = await db.execute(select(Video))
            videos = result.scalars().all()
            print_result(f"Video table readable ({len(videos)} rows)", True)

        passed += 1
    except Exception as e:
        print_result("Database", False, str(e))

    # ── Summary ───────────────────────────────────────────────────────
    print_header(f"RESULTS: {passed}/{total} PASSED")
    if passed == total:
        print("  All tests passed! The pipeline should work correctly.")
    else:
        print(f"  {total - passed} test(s) failed. Fix the issues above.")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
