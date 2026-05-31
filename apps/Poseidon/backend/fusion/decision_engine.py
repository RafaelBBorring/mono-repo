"""
Fusion & Decision Engine

Combines 4 parallel agent outputs into a final classification decision:

  1. Weighted Vote  – each valid agent contributes its confidence × weight.
     Agents that fail (error or no match) are excluded and remaining weights
     are normalised so they still sum to 1.0.

  2. Consistency Bonus – if 3+ agents agree on the same surfist, add +0.05 bonus.

  3. Routing:
       final_confidence ≥ 0.85  →  AUTO_CLASSIFIED  (Surfist_N folder)
       0.40 ≤ …        < 0.85  →  PENDING_REVIEW   (human review queue)
       …                < 0.40  →  UNCLASSIFIED
"""

from typing import Any, Dict, List, Optional

import numpy as np
from loguru import logger

from agents.base_agent import AgentResult
from config import settings
from models import ClassificationStatus


# ── Result dataclass ──────────────────────────────────────────────────────────

class FusionResult:
    def __init__(
        self,
        surfist_id: Optional[str],
        final_confidence: float,
        status: ClassificationStatus,
        agent_results: List[AgentResult],
        vote_breakdown: Dict[str, float],
        reason: str = "",
    ):
        self.surfist_id       = surfist_id
        self.final_confidence = final_confidence
        self.status           = status
        self.agent_results    = agent_results
        self.vote_breakdown   = vote_breakdown
        self.reason           = reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "surfist_id":       self.surfist_id,
            "final_confidence": round(self.final_confidence, 4),
            "status":           self.status.value,
            "reason":           self.reason,
            "agents": {
                r.agent_name: r.to_dict()
                for r in self.agent_results
            },
            "vote_breakdown": self.vote_breakdown,
        }


# ── Engine ─────────────────────────────────────────────────────────────────────

class DecisionEngine:
    """
    Stateless fusion engine – instantiate once and call .fuse() per video.
    """

    AGENT_WEIGHTS: Dict[str, float] = {
        "FaceAgent":     settings.FACE_WEIGHT,
        "PoseAgent":     settings.POSE_WEIGHT,
        "BoardAgent":    settings.BOARD_WEIGHT,
        "ClothingAgent": settings.CLOTHING_WEIGHT,
    }

    CONSISTENCY_BONUS: float = 0.05   # Added when ≥3 agents agree
    MIN_AGREEMENT_AGENTS: int = 3     # Agents needed for consistency bonus

    def fuse(self, agent_results: List[AgentResult]) -> FusionResult:
        """
        Main fusion entry point.

        Args:
            agent_results: List of AgentResult from all 4 agents (may include errors).

        Returns:
            FusionResult with final decision.
        """
        # ── Filter valid agents ───────────────────────────────────────────────
        valid = [r for r in agent_results if r.is_valid]

        if not valid:
            logger.info("[Fusion] No valid agent results → UNCLASSIFIED")
            return FusionResult(
                surfist_id=None,
                final_confidence=0.0,
                status=ClassificationStatus.UNCLASSIFIED,
                agent_results=agent_results,
                vote_breakdown={},
                reason=self._explain_no_valid_agents(agent_results),
            )

        # ── Collect weighted votes per surfist ────────────────────────────────
        total_weight = sum(
            self.AGENT_WEIGHTS.get(r.agent_name, 0.25)
            for r in valid
        )

        votes: Dict[str, float] = {}      # {surfist_id: accumulated_weighted_confidence}
        vote_breakdown: Dict[str, float] = {}

        for r in valid:
            weight = self.AGENT_WEIGHTS.get(r.agent_name, 0.25)
            normalised_weight = weight / total_weight  # Renormalise missing agents
            contribution = normalised_weight * r.confidence
            votes[r.surfist_id] = votes.get(r.surfist_id, 0.0) + contribution
            vote_breakdown[r.agent_name] = round(r.confidence, 4)

        # ── Best surfist by vote ──────────────────────────────────────────────
        best_id = max(votes, key=votes.get)
        raw_confidence = votes[best_id]

        # ── Consistency bonus ─────────────────────────────────────────────────
        agree_count = sum(1 for r in valid if r.surfist_id == best_id)
        if agree_count >= self.MIN_AGREEMENT_AGENTS:
            bonus = self.CONSISTENCY_BONUS * (agree_count / len(valid))
            raw_confidence = min(1.0, raw_confidence + bonus)
            logger.debug(
                "[Fusion] Consistency bonus +%.3f (%d/%d agents agree on %s)",
                bonus, agree_count, len(valid), best_id,
            )

        final_confidence = float(np.clip(raw_confidence, 0.0, 1.0))

        # ── Routing decision ──────────────────────────────────────────────────
        status = self._route(final_confidence)

        # If routed to unclassified, don't assign a surfist
        assigned_id = best_id if status != ClassificationStatus.UNCLASSIFIED else None
        reason = self._explain_route(
            status=status,
            final_confidence=final_confidence,
            votes=votes,
            agree_count=agree_count,
            valid_count=len(valid),
            total_count=len(agent_results),
        )

        logger.info(
            "[Fusion] → %s (confidence=%.3f, surfist=%s, agents=%d/%d)",
            status.value, final_confidence, assigned_id,
            len(valid), len(agent_results),
        )

        return FusionResult(
            surfist_id=assigned_id,
            final_confidence=final_confidence,
            status=status,
            agent_results=agent_results,
            vote_breakdown={
                **vote_breakdown,
                "_votes": {k: round(v, 4) for k, v in votes.items()},
                "_agree_count": agree_count,
            },
            reason=reason,
        )

    @staticmethod
    def _route(confidence: float) -> ClassificationStatus:
        if confidence >= settings.AUTO_CLASSIFY_THRESHOLD:
            return ClassificationStatus.AUTO_CLASSIFIED
        elif confidence >= settings.HUMAN_REVIEW_THRESHOLD:
            return ClassificationStatus.PENDING_REVIEW
        else:
            return ClassificationStatus.UNCLASSIFIED

    @staticmethod
    def _explain_no_valid_agents(agent_results: List[AgentResult]) -> str:
        extracted = [r.agent_name for r in agent_results if r.embedding is not None]
        errors = [f"{r.agent_name}: {r.error}" for r in agent_results if r.error]

        if extracted:
            return (
                "Os agentes extraíram sinais do vídeo, mas nenhum perfil cadastrado "
                "ficou acima do limiar de correspondência."
            )
        if errors:
            return "Nenhum agente encontrou sinal utilizável. " + " | ".join(errors[:2])
        return "Nenhum agente encontrou sinal utilizável para classificar o vídeo."

    @staticmethod
    def _explain_route(
        status: ClassificationStatus,
        final_confidence: float,
        votes: Dict[str, float],
        agree_count: int,
        valid_count: int,
        total_count: int,
    ) -> str:
        pct = round(final_confidence * 100)
        candidates = sorted(votes.items(), key=lambda item: item[1], reverse=True)
        conflict = len(candidates) > 1 and (candidates[0][1] - candidates[1][1]) < 0.18

        if status == ClassificationStatus.AUTO_CLASSIFIED:
            return (
                f"Classificação automática: {agree_count}/{valid_count} agentes "
                f"votaram no mesmo surfista com {pct}% de confiança."
            )
        if status == ClassificationStatus.PENDING_REVIEW:
            if conflict:
                return (
                    "Revisão humana necessária: os agentes apontaram candidatos "
                    f"próximos entre si e a confiança final ficou em {pct}%."
                )
            return (
                f"Revisão humana necessária: há sinais de correspondência, mas a "
                f"confiança final de {pct}% ficou abaixo do limite automático."
            )
        if valid_count < max(total_count // 2, 1):
            return (
                "Não classificado: poucos agentes encontraram correspondência "
                f"confiável ({valid_count}/{total_count})."
            )
        return (
            f"Não classificado: a melhor correspondência ficou em {pct}%, abaixo "
            "do limite mínimo para revisão."
        )

    # ── Folder similarity for Level 1 Review ──────────────────────────────────

    @staticmethod
    def compute_inter_surfist_similarity(
        surfist_profiles: Dict[str, Any],
    ) -> Dict[str, Dict[str, float]]:
        """
        Compute pairwise cosine similarity between all surfists' face embeddings.
        Used by Level 1 Review to flag potential misclassifications.

        Returns: {surfist_a_id: {surfist_b_id: similarity, ...}, ...}
        """
        from agents.base_agent import BaseAgent

        ids = list(surfist_profiles.keys())
        matrix: Dict[str, Dict[str, float]] = {sid: {} for sid in ids}

        for i, id_a in enumerate(ids):
            embs_a = surfist_profiles[id_a].get("face_embeddings", [])
            if not embs_a:
                continue
            mean_a = np.mean(embs_a, axis=0)

            for id_b in ids[i+1:]:
                embs_b = surfist_profiles[id_b].get("face_embeddings", [])
                if not embs_b:
                    continue
                mean_b = np.mean(embs_b, axis=0)
                sim = BaseAgent.cosine_similarity(mean_a, mean_b)
                matrix[id_a][id_b] = round(sim, 4)
                matrix[id_b][id_a] = round(sim, 4)

        return matrix


# Singleton instance
decision_engine = DecisionEngine()
