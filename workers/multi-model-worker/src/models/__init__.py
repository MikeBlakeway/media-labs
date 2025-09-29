"""
Models package for multi-modal inference worker.

Provides model management framework with intelligent loading, caching,
eviction, and memory monitoring for AI model operations.
"""

from .base_model import BaseModel, ModelMetadata
from .memory_monitor import MemoryMonitor, MemoryStats, memory_monitor
from .model_manager import ModelManager, model_manager

__all__ = [
    # Base classes
    "BaseModel",
    "ModelMetadata",

    # Memory monitoring
    "MemoryMonitor",
    "MemoryStats",
    "memory_monitor",

    # Model management
    "ModelManager",
    "model_manager",
]

# Import model wrappers when available
# from .flux_model import FluxModel
# from .controlnet_model import ControlNetModel
# from .animatediff_model import AnimateDiffModel
# from .ltx_video_model import LTXVideoModel
# from .inpainting_model import InpaintingModel
# from .camera_control_model import CameraControlModel

__all__ = [
    # "FluxModel",
    # "ControlNetModel",
    # "AnimateDiffModel",
    # "LTXVideoModel",
    # "InpaintingModel",
    # "CameraControlModel",
]