"""
Model Manager with LRU eviction and intelligent memory management.

Provides centralized model loading, caching, and eviction with thread-safe
operations, memory monitoring, and priority-based LRU algorithms.
"""

import logging
import threading
from typing import Dict, Any, Optional, List, Type, Set
from datetime import datetime, timedelta
from collections import OrderedDict
import time
from concurrent.futures import ThreadPoolExecutor, Future
from pathlib import Path

from .base_model import BaseModel, ModelMetadata
from .memory_monitor import memory_monitor, MemoryStats
try:
    from ..utils.config import config
    from ..utils.exceptions import (
        ModelLoadError, ModelNotFoundError, MemoryError,
        ModelEvictionError, ConcurrencyError
    )
except ImportError:
    from src.utils.config import config
    from src.utils.exceptions import (
        ModelLoadError, ModelNotFoundError, MemoryError,
        ModelEvictionError, ConcurrencyError
    )

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Thread-safe model manager with LRU eviction and intelligent memory management.

    Manages the lifecycle of AI models including loading, caching, eviction,
    and memory optimization. Provides concurrent access with proper locking
    and integrates with memory monitoring for automatic eviction.
    """

    def __init__(self):
        """Initialize the model manager."""

        # Configuration from config module
        self.max_models = config.max_models_in_memory
        self.model_timeout = timedelta(seconds=config.model_timeout_seconds)
        self.protect_duration = timedelta(minutes=config.protect_recently_used_minutes)

        # Model storage and tracking
        self._loaded_models: OrderedDict[str, BaseModel] = OrderedDict()
        self._model_registry: Dict[str, ModelMetadata] = {}
        self._loading_models: Set[str] = set()

        # Thread safety
        self._models_lock = threading.RLock()
        self._registry_lock = threading.RLock()
        self._loading_lock = threading.RLock()

        # Background operations
        self._executor = ThreadPoolExecutor(
            max_workers=config.max_concurrent_loads,
            thread_name_prefix="ModelLoader"
        )
        self._loading_futures: Dict[str, Future] = {}

        # Statistics and monitoring
        self._stats = {
            "models_loaded": 0,
            "models_evicted": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "eviction_triggers": 0,
            "memory_warnings": 0,
        }

        # Set up memory monitoring callbacks
        memory_monitor.add_warning_callback(self._on_memory_warning)
        memory_monitor.add_eviction_callback(self._on_memory_pressure)

        # Start memory monitoring if not already running
        if not memory_monitor._monitoring:
            memory_monitor.start_monitoring()

        logger.info(f"ModelManager initialized (max_models: {self.max_models})")

    def register_model(
        self,
        model_name: str,
        model_class: Type[BaseModel],
        model_path: Path,
        priority: int = 50,
        estimated_memory_mb: int = 0,
        **kwargs
    ) -> None:
        """
        Register a model for lazy loading.

        Args:
            model_name: Unique model identifier
            model_class: BaseModel subclass for this model
            model_path: Path to model files
            priority: Loading priority (0-100, higher = keep longer)
            estimated_memory_mb: Estimated memory usage
            **kwargs: Additional arguments for model construction
        """
        with self._registry_lock:
            if model_name in self._model_registry:
                logger.warning(f"Overwriting existing model registration: {model_name}")

            # Store model class in kwargs for later retrieval
            kwargs['model_class'] = model_class

            # Create metadata entry
            metadata = ModelMetadata(
                model_name=model_name,
                model_type=model_class.__name__,
                model_path=model_path,
                estimated_memory_mb=estimated_memory_mb,
                priority=priority,
                config=kwargs
            )

            self._model_registry[model_name] = metadata
            logger.info(f"Registered model: {model_name} ({model_class.__name__})")

    def get_model(self, model_name: str, timeout_seconds: float = 30.0) -> BaseModel:
        """
        Get a loaded model, loading it if necessary.

        Args:
            model_name: Name of model to retrieve
            timeout_seconds: Max time to wait for loading

        Returns:
            Loaded model instance

        Raises:
            ModelNotFoundError: If model not registered
            ModelLoadError: If loading fails
            ConcurrencyError: If loading times out
        """
        # Check if model is already loaded
        with self._models_lock:
            if model_name in self._loaded_models:
                model = self._loaded_models[model_name]
                model.mark_used()

                # Move to end for LRU ordering
                self._loaded_models.move_to_end(model_name)
                self._stats["cache_hits"] += 1

                logger.debug(f"Cache hit for model: {model_name}")
                return model

        # Cache miss - need to load
        self._stats["cache_misses"] += 1
        logger.debug(f"Cache miss for model: {model_name}")

        # Check if model is registered
        with self._registry_lock:
            if model_name not in self._model_registry:
                raise ModelNotFoundError(model_name, "Not in registry")
            metadata = self._model_registry[model_name]

        # Check if already loading
        with self._loading_lock:
            if model_name in self._loading_models:
                # Wait for existing load to complete
                future = self._loading_futures.get(model_name)
                if future:
                    try:
                        future.result(timeout=timeout_seconds)
                    except Exception as e:
                        raise ConcurrencyError("loading", model_name) from e

                # Try again after waiting
                with self._models_lock:
                    if model_name in self._loaded_models:
                        model = self._loaded_models[model_name]
                        model.mark_used()
                        self._loaded_models.move_to_end(model_name)
                        return model

        # Start loading process
        return self._load_model_with_eviction(model_name, metadata, timeout_seconds)

    def _load_model_with_eviction(
        self,
        model_name: str,
        metadata: ModelMetadata,
        timeout_seconds: float
    ) -> BaseModel:
        """Load model with automatic eviction if needed."""

        # Check memory availability
        estimated_memory = metadata.estimated_memory_mb
        if estimated_memory > 0 and not memory_monitor.can_load_model(estimated_memory):
            logger.warning(
                f"Insufficient memory for {model_name} ({estimated_memory}MB), "
                "attempting eviction"
            )
            self._evict_for_memory(estimated_memory)

        # Check model count limits
        with self._models_lock:
            if len(self._loaded_models) >= self.max_models:
                logger.info(f"Model limit reached ({self.max_models}), evicting LRU model")
                self._evict_lru_models(1)

        # Start loading
        with self._loading_lock:
            if model_name in self._loading_models:
                raise ConcurrencyError("loading", model_name)

            self._loading_models.add(model_name)

            # Submit loading task
            future = self._executor.submit(self._load_model_sync, model_name, metadata)
            self._loading_futures[model_name] = future

        try:
            # Wait for loading to complete
            model = future.result(timeout=timeout_seconds)

            # Add to loaded models
            with self._models_lock:
                self._loaded_models[model_name] = model
                self._loaded_models.move_to_end(model_name)  # Most recently loaded

            self._stats["models_loaded"] += 1
            logger.info(f"Successfully loaded model: {model_name}")

            return model

        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise ModelLoadError(model_name, str(e)) from e

        finally:
            # Clean up loading tracking
            with self._loading_lock:
                self._loading_models.discard(model_name)
                self._loading_futures.pop(model_name, None)

    def _load_model_sync(self, model_name: str, metadata: ModelMetadata) -> BaseModel:
        """Synchronously load a model (called from thread pool)."""
        logger.info(f"Loading model: {model_name}")

        # Get model class from registry
        model_class_name = metadata.model_type
        # TODO: This needs a proper model class registry
        # For now, we'll assume the model class is passed in metadata.config
        model_class = metadata.config.get('model_class')
        if not model_class:
            raise ModelLoadError(model_name, f"No model class found for type: {model_class_name}")

        # Create model instance
        model = model_class(
            model_name=model_name,
            model_path=metadata.model_path,
            priority=metadata.priority,
            **{k: v for k, v in metadata.config.items() if k != 'model_class'}
        )

        # Load the model
        start_time = time.time()
        model.load()
        load_time = time.time() - start_time

        logger.info(
            f"Model {model_name} loaded in {load_time:.2f}s "
            f"({model.memory_usage_mb}MB memory)"
        )

        return model

    def _evict_lru_models(self, count: int) -> List[str]:
        """Evict the specified number of least recently used models."""
        evicted = []

        with self._models_lock:
            # Get models sorted by eviction score (ascending = evict first)
            candidates = []
            for model_name, model in self._loaded_models.items():
                # Skip recently used models (protection period)
                if model.get_age_minutes() < self.protect_duration.total_seconds() / 60:
                    continue

                candidates.append((model.calculate_eviction_score(), model_name, model))

            # Sort by eviction score (lowest first)
            candidates.sort(key=lambda x: x[0])

            # Evict the requested number of models
            for i in range(min(count, len(candidates))):
                _, model_name, model = candidates[i]

                try:
                    self._evict_model_unsafe(model_name, model)
                    evicted.append(model_name)

                except Exception as e:
                    logger.error(f"Failed to evict model {model_name}: {e}")

        if evicted:
            self._stats["models_evicted"] += len(evicted)
            logger.info(f"Evicted {len(evicted)} models: {evicted}")

        return evicted

    def _evict_for_memory(self, required_mb: int) -> None:
        """Evict models until enough memory is available."""
        attempts = 0
        max_attempts = 5

        while attempts < max_attempts:
            if memory_monitor.can_load_model(required_mb):
                return

            # Try evicting one model
            evicted = self._evict_lru_models(1)
            if not evicted:
                # No more models to evict
                break

            # Clear GPU cache after eviction
            memory_monitor.clear_gpu_cache()
            attempts += 1

        # Final check
        if not memory_monitor.can_load_model(required_mb):
            available = memory_monitor.estimate_available_memory_mb()
            raise MemoryError("model_loading", required_mb, available)

    def _evict_model_unsafe(self, model_name: str, model: BaseModel) -> None:
        """Evict a specific model (must hold models_lock)."""
        logger.info(f"Evicting model: {model_name}")

        try:
            # Unload the model
            model.unload()

            # Remove from loaded models
            del self._loaded_models[model_name]

        except Exception as e:
            raise ModelEvictionError(model_name, str(e)) from e

    def evict_model(self, model_name: str) -> bool:
        """
        Manually evict a specific model.

        Args:
            model_name: Name of model to evict

        Returns:
            True if model was evicted, False if not loaded
        """
        with self._models_lock:
            if model_name not in self._loaded_models:
                return False

            model = self._loaded_models[model_name]
            self._evict_model_unsafe(model_name, model)
            self._stats["models_evicted"] += 1

            logger.info(f"Manually evicted model: {model_name}")
            return True

    def clear_all_models(self) -> List[str]:
        """
        Evict all loaded models.

        Returns:
            List of evicted model names
        """
        evicted = []

        with self._models_lock:
            model_names = list(self._loaded_models.keys())

            for model_name in model_names:
                try:
                    model = self._loaded_models[model_name]
                    self._evict_model_unsafe(model_name, model)
                    evicted.append(model_name)

                except Exception as e:
                    logger.error(f"Failed to evict model {model_name}: {e}")

        if evicted:
            self._stats["models_evicted"] += len(evicted)
            memory_monitor.clear_gpu_cache()
            logger.info(f"Cleared all models: {evicted}")

        return evicted

    def _on_memory_warning(self, stats: MemoryStats) -> None:
        """Callback for memory warning events."""
        self._stats["memory_warnings"] += 1
        logger.warning(f"Memory warning: {stats.gpu_utilization_percent:.1f}% usage")

    def _on_memory_pressure(self, stats: MemoryStats) -> None:
        """Callback for memory pressure events - trigger eviction."""
        self._stats["eviction_triggers"] += 1
        logger.error(f"Memory pressure: {stats.gpu_utilization_percent:.1f}% usage - evicting models")

        # Evict at least one model
        evicted = self._evict_lru_models(1)

        # Clear GPU cache
        memory_monitor.clear_gpu_cache()

        if evicted:
            logger.info(f"Emergency eviction completed: {evicted}")
        else:
            logger.error("No models available for emergency eviction")

    def get_loaded_models(self) -> List[str]:
        """Get list of currently loaded model names."""
        with self._models_lock:
            return list(self._loaded_models.keys())

    def get_registered_models(self) -> List[str]:
        """Get list of registered model names."""
        with self._registry_lock:
            return list(self._model_registry.keys())

    def is_model_loaded(self, model_name: str) -> bool:
        """Check if a model is currently loaded."""
        with self._models_lock:
            return model_name in self._loaded_models

    def get_model_status(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get status information for a specific model."""
        with self._models_lock:
            if model_name not in self._loaded_models:
                return None
            return self._loaded_models[model_name].get_status_dict()

    def get_manager_status(self) -> Dict[str, Any]:
        """Get comprehensive manager status."""
        with self._models_lock:
            loaded_models = [
                model.get_status_dict()
                for model in self._loaded_models.values()
            ]

        with self._registry_lock:
            registered_count = len(self._model_registry)

        memory_summary = memory_monitor.get_memory_summary()

        return {
            "loaded_models": loaded_models,
            "loaded_count": len(loaded_models),
            "registered_count": registered_count,
            "max_models": self.max_models,
            "memory_summary": memory_summary,
            "statistics": self._stats.copy(),
            "configuration": {
                "max_models": self.max_models,
                "model_timeout_seconds": self.model_timeout.total_seconds(),
                "protect_duration_minutes": self.protect_duration.total_seconds() / 60,
            }
        }

    def shutdown(self) -> None:
        """Shutdown the model manager and cleanup resources."""
        logger.info("Shutting down ModelManager")

        # Clear all models
        self.clear_all_models()

        # Shutdown thread pool
        self._executor.shutdown(wait=True)

        # Stop memory monitoring
        memory_monitor.stop_monitoring()

        logger.info("ModelManager shutdown complete")


# Global model manager instance
model_manager = ModelManager()