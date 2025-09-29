"""
Abstract base class for all model implementations in the multi-modal inference worker.

Defines the interface and common functionality that all model types must implement,
ensuring consistent loading, inference, and resource management patterns.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Union
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseModel(ABC):
    """
    Abstract base class for all AI models in the multi-modal inference system.

    Provides common interface for model loading, inference, memory management,
    and lifecycle operations. All specific model implementations must inherit
    from this class.
    """

    def __init__(
        self,
        model_name: str,
        model_path: Path,
        priority: int = 50,
        device: str = "cuda"
    ):
        """
        Initialize base model.

        Args:
            model_name: Unique identifier for this model
            model_path: Path to model files on disk
            priority: Priority for eviction (0-100, higher = keep longer)
            device: Device to load model on (cuda/cpu)
        """
        self.model_name = model_name
        self.model_path = model_path
        self.priority = priority
        self.device = device

        # Runtime state
        self.is_loaded = False
        self.load_time: Optional[datetime] = None
        self.last_used: Optional[datetime] = None
        self.use_count = 0
        self.memory_usage_mb = 0

        # Model instance (to be set by subclasses)
        self._model: Optional[Any] = None

        logger.debug(f"Initialized {self.__class__.__name__}: {model_name}")

    @abstractmethod
    def load(self) -> None:
        """
        Load the model into memory.

        Must be implemented by subclasses to handle their specific loading logic.
        Should set self._model, self.is_loaded, self.load_time, and self.memory_usage_mb.

        Raises:
            ModelLoadError: If loading fails
            MemoryError: If insufficient memory
        """
        pass

    @abstractmethod
    def unload(self) -> None:
        """
        Unload the model from memory.

        Must be implemented by subclasses to properly clean up resources.
        Should reset self._model, self.is_loaded, and self.memory_usage_mb.
        """
        pass

    @abstractmethod
    def infer(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform inference with the model.

        Args:
            inputs: Input parameters for inference

        Returns:
            Dict containing inference results

        Raises:
            ValidationError: If inputs are invalid
            InferenceError: If inference fails
        """
        pass

    @abstractmethod
    def get_memory_usage(self) -> int:
        """
        Get current memory usage in MB.

        Returns:
            Memory usage in megabytes
        """
        pass

    @abstractmethod
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """
        Validate inference inputs.

        Args:
            inputs: Input parameters to validate

        Returns:
            True if inputs are valid

        Raises:
            ValidationError: If inputs are invalid
        """
        pass

    def mark_used(self) -> None:
        """Mark model as recently used for LRU tracking."""
        self.last_used = datetime.now()
        self.use_count += 1
        logger.debug(f"Model {self.model_name} marked as used (count: {self.use_count})")

    def get_age_minutes(self) -> float:
        """Get minutes since model was last used."""
        if self.last_used is None:
            return float('inf')
        return (datetime.now() - self.last_used).total_seconds() / 60

    def get_load_age_minutes(self) -> float:
        """Get minutes since model was loaded."""
        if self.load_time is None:
            return float('inf')
        return (datetime.now() - self.load_time).total_seconds() / 60

    def calculate_eviction_score(self) -> float:
        """
        Calculate eviction score for LRU algorithm.

        Lower scores are evicted first. Score considers:
        - Priority (0-100)
        - Last used time (minutes ago)
        - Use frequency
        - Memory usage

        Returns:
            Eviction score (lower = evict first)
        """
        if not self.is_loaded:
            return 0.0

        # Base score from priority (0-100)
        score = float(self.priority)

        # Penalty for age (minutes since last use)
        age_minutes = self.get_age_minutes()
        if age_minutes != float('inf'):
            age_penalty = min(age_minutes / 60.0, 10.0)  # Max 10 point penalty
            score -= age_penalty

        # Bonus for frequent use (use count)
        use_bonus = min(self.use_count / 10.0, 5.0)  # Max 5 point bonus
        score += use_bonus

        # Small penalty for large memory usage
        memory_penalty = min(self.memory_usage_mb / 1000.0, 2.0)  # Max 2 point penalty
        score -= memory_penalty

        return max(score, 0.0)  # Don't go negative

    def get_status_dict(self) -> Dict[str, Any]:
        """Get model status as dictionary for monitoring/debugging."""
        return {
            "model_name": self.model_name,
            "model_path": str(self.model_path),
            "is_loaded": self.is_loaded,
            "priority": self.priority,
            "device": self.device,
            "memory_usage_mb": self.memory_usage_mb,
            "use_count": self.use_count,
            "age_minutes": self.get_age_minutes(),
            "load_age_minutes": self.get_load_age_minutes(),
            "eviction_score": self.calculate_eviction_score(),
            "load_time": self.load_time.isoformat() if self.load_time else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
        }

    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"{self.__class__.__name__}("
            f"name='{self.model_name}', "
            f"loaded={self.is_loaded}, "
            f"memory={self.memory_usage_mb}MB, "
            f"priority={self.priority})"
        )


class ModelMetadata:
    """
    Metadata container for model information without loading the actual model.

    Used for model discovery, validation, and management without memory overhead.
    """

    def __init__(
        self,
        model_name: str,
        model_type: str,
        model_path: Path,
        estimated_memory_mb: int = 0,
        priority: int = 50,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize model metadata.

        Args:
            model_name: Unique identifier
            model_type: Type of model (flux, controlnet, etc.)
            model_path: Path to model files
            estimated_memory_mb: Estimated memory usage
            priority: Loading priority (0-100)
            config: Additional configuration parameters
        """
        self.model_name = model_name
        self.model_type = model_type
        self.model_path = model_path
        self.estimated_memory_mb = estimated_memory_mb
        self.priority = priority
        self.config = config or {}

        # Validation
        if not model_path.exists():
            try:
                from ..utils.exceptions import ModelNotFoundError
            except ImportError:
                from src.utils.exceptions import ModelNotFoundError
            raise ModelNotFoundError(model_name, str(model_path))

    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary."""
        return {
            "model_name": self.model_name,
            "model_type": self.model_type,
            "model_path": str(self.model_path),
            "estimated_memory_mb": self.estimated_memory_mb,
            "priority": self.priority,
            "config": self.config,
        }