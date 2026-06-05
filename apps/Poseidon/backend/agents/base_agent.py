"""
BaseAgent – abstract foundation for all 4 classification agents.

Each agent follows the same contract:
  initialize()          → load model weights
  extract_features()    → process frames → embedding vector
  match_database()      → compare vector against surfist profiles
  analyze()             → full pipeline, returns AgentResult
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np
from loguru import logger


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class AgentResult:
    agent_name: str
    surfist_id: Optional[str]
    confidence: float                        # 0.0 – 1.0
    embedding: Optional[np.ndarray] = None  # Feature vector for this video
    features: Dict[str, Any] = field(default_factory=dict)
    visual_path: Optional[str] = None       # Path to extracted evidence image
    description: str = ""
    error: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        return self.error is None and self.surfist_id is not None

    def to_dict(self) -> Dict:
        return {
            "agent": self.agent_name,
            "surfist_id": self.surfist_id,
            "confidence": round(self.confidence, 4),
            "features": self.features,
            "visual_path": self.visual_path,
            "description": self.description,
            "error": self.error,
        }


# ── Base agent ────────────────────────────────────────────────────────────────

class BaseAgent(ABC):
    """
    All 4 agents inherit from this.
    Subclasses implement initialize(), extract_features(), match_database().
    """

    def __init__(self, name: str, weight: float = 0.25):
        self.name = name
        self.weight = weight
        self._initialized = False
        self._init_error: Optional[str] = None

    # ── Abstract interface ────────────────────────────────────────────────────

    @abstractmethod
    async def initialize(self) -> None:
        """Load model weights and any required resources."""
        pass

    @abstractmethod
    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        """
        Compute a single representative embedding from a list of BGR frames.
        Returns None if no useful signal was found (e.g., no face detected).
        """
        pass

    @abstractmethod
    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        """
        Compare embedding against all stored surfist embeddings.
        Returns an AgentResult with the best match and confidence.
        """
        pass

    # ── Public pipeline ───────────────────────────────────────────────────────

    async def analyze(
        self,
        video_path: str,
        frames: List[np.ndarray],
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        """
        Full agent pipeline. Catches all exceptions so one failing agent
        never blocks the others.
        """
        try:
            # Lazy initialization
            if not self._initialized:
                if self._init_error:
                    raise RuntimeError(f"Previous init failed: {self._init_error}")
                await self.initialize()
                self._initialized = True

            # Feature extraction
            embedding = await self.extract_features(video_path, frames)
            if embedding is None:
                return AgentResult(
                    agent_name=self.name,
                    surfist_id=None,
                    confidence=0.0,
                    error="No usable signal extracted from video",
                )

            # Database matching
            result = await self.match_database(embedding, surfist_profiles)
            return result

        except Exception as exc:
            self._init_error = str(exc) if not self._initialized else None
            logger.warning(f"[{self.name}] Analysis failed: {exc}")
            return AgentResult(
                agent_name=self.name,
                surfist_id=None,
                confidence=0.0,
                error=str(exc),
            )

    # ── Helpers shared by subclasses ──────────────────────────────────────────

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Cosine similarity in [0, 1] (0 = opposite, 1 = identical)."""
        a, b = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
        na, nb = np.linalg.norm(a), np.linalg.norm(b)
        if na == 0 or nb == 0:
            return 0.0
        sim = float(np.dot(a, b) / (na * nb))
        return float(np.clip((sim + 1) / 2, 0.0, 1.0))  # Shift [-1,1] → [0,1]

    @staticmethod
    def best_match(
        query: np.ndarray,
        profiles: Dict[str, List[List[float]]],
        threshold: float = 0.60,
    ) -> tuple[Optional[str], float]:
        """
        Compare query embedding against all stored embeddings per surfist.
        For each surfist, take the max similarity over all their reference embeddings.
        Returns (surfist_id, confidence) of the best match, or (None, 0.0).
        """
        best_id: Optional[str] = None
        best_sim: float = 0.0

        for surfist_id, embeddings in profiles.items():
            if not embeddings:
                continue
            sims = [
                BaseAgent.cosine_similarity(query, np.array(emb))
                for emb in embeddings
            ]
            top_sim = max(sims)
            if top_sim > best_sim:
                best_sim = top_sim
                best_id = surfist_id

        if best_sim < threshold:
            return None, best_sim
        return best_id, best_sim
