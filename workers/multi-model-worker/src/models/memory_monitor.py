"""
GPU memory monitoring system for multi-modal inference worker.

Provides real-time tracking of GPU memory usage, threshold detection,
and intelligent eviction triggering to prevent out-of-memory errors.
"""

import torch
import psutil
import logging
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime
import threading
import time

try:
    from ..utils.config import config
    from ..utils.exceptions import MemoryError
except ImportError:
    from src.utils.config import config
    from src.utils.exceptions import MemoryError

logger = logging.getLogger(__name__)


@dataclass
class MemoryStats:
    """Container for memory usage statistics."""

    # GPU Memory (if available)
    gpu_total_mb: int = 0
    gpu_allocated_mb: int = 0
    gpu_cached_mb: int = 0
    gpu_free_mb: int = 0
    gpu_utilization_percent: float = 0.0

    # System Memory
    system_total_mb: int = 0
    system_used_mb: int = 0
    system_available_mb: int = 0
    system_utilization_percent: float = 0.0

    # Timestamp
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/monitoring."""
        return {
            "gpu_total_mb": self.gpu_total_mb,
            "gpu_allocated_mb": self.gpu_allocated_mb,
            "gpu_cached_mb": self.gpu_cached_mb,
            "gpu_free_mb": self.gpu_free_mb,
            "gpu_utilization_percent": self.gpu_utilization_percent,
            "system_total_mb": self.system_total_mb,
            "system_used_mb": self.system_used_mb,
            "system_available_mb": self.system_available_mb,
            "system_utilization_percent": self.system_utilization_percent,
            "timestamp": self.timestamp.isoformat(),
        }


class MemoryMonitor:
    """
    Real-time GPU and system memory monitoring with threshold management.

    Provides continuous monitoring, threshold detection, and callback triggering
    for intelligent memory management and model eviction.
    """

    def __init__(self, check_interval_seconds: int = None):
        """
        Initialize memory monitor.

        Args:
            check_interval_seconds: How often to check memory (default from config)
        """
        self.check_interval = check_interval_seconds or config.memory_check_interval_seconds
        self.warning_threshold = config.memory_warning_percent
        self.eviction_threshold = config.memory_threshold_percent

        # State tracking
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._shutdown_event = threading.Event()

        # Callbacks for threshold events
        self._warning_callbacks: list[Callable[[MemoryStats], None]] = []
        self._eviction_callbacks: list[Callable[[MemoryStats], None]] = []

        # Current stats
        self._current_stats: Optional[MemoryStats] = None
        self._stats_lock = threading.Lock()

        # CUDA availability check
        self.cuda_available = torch.cuda.is_available()
        if not self.cuda_available:
            logger.warning("CUDA not available - GPU memory monitoring disabled")

        logger.info(f"MemoryMonitor initialized (CUDA: {self.cuda_available})")

    def get_current_stats(self) -> MemoryStats:
        """Get current memory statistics."""
        stats = MemoryStats()

        # GPU Memory Stats (if CUDA available)
        if self.cuda_available and torch.cuda.device_count() > 0:
            try:
                # Use primary GPU (device 0)
                device = torch.device("cuda:0")

                # Get memory info
                total_memory = torch.cuda.get_device_properties(0).total_memory
                allocated_memory = torch.cuda.memory_allocated(0)
                cached_memory = torch.cuda.memory_reserved(0)

                # Convert to MB
                stats.gpu_total_mb = total_memory // (1024 * 1024)
                stats.gpu_allocated_mb = allocated_memory // (1024 * 1024)
                stats.gpu_cached_mb = cached_memory // (1024 * 1024)
                stats.gpu_free_mb = stats.gpu_total_mb - stats.gpu_allocated_mb

                # Calculate utilization
                if stats.gpu_total_mb > 0:
                    stats.gpu_utilization_percent = (
                        stats.gpu_allocated_mb / stats.gpu_total_mb * 100
                    )

            except Exception as e:
                logger.warning(f"Failed to get GPU memory stats: {e}")

        # System Memory Stats
        try:
            memory = psutil.virtual_memory()
            stats.system_total_mb = memory.total // (1024 * 1024)
            stats.system_used_mb = memory.used // (1024 * 1024)
            stats.system_available_mb = memory.available // (1024 * 1024)
            stats.system_utilization_percent = memory.percent

        except Exception as e:
            logger.warning(f"Failed to get system memory stats: {e}")

        # Update cached stats
        with self._stats_lock:
            self._current_stats = stats

        return stats

    def check_memory_pressure(self) -> tuple[bool, bool]:
        """
        Check if memory pressure thresholds are exceeded.

        Returns:
            Tuple of (warning_exceeded, eviction_needed)
        """
        stats = self.get_current_stats()

        # Use GPU utilization if available, otherwise system memory
        utilization = (
            stats.gpu_utilization_percent if self.cuda_available
            else stats.system_utilization_percent
        )

        warning_exceeded = utilization >= self.warning_threshold
        eviction_needed = utilization >= self.eviction_threshold

        return warning_exceeded, eviction_needed

    def estimate_available_memory_mb(self) -> int:
        """Estimate available memory for model loading in MB."""
        stats = self.get_current_stats()

        if self.cuda_available:
            # For GPU, use free GPU memory minus safety buffer
            safety_buffer_mb = 512  # 512MB safety buffer
            available = max(0, stats.gpu_free_mb - safety_buffer_mb)
        else:
            # For CPU, use available system memory minus buffer
            safety_buffer_mb = 1024  # 1GB safety buffer for CPU
            available = max(0, stats.system_available_mb - safety_buffer_mb)

        return available

    def can_load_model(self, estimated_memory_mb: int) -> bool:
        """Check if there's enough memory to load a model."""
        available = self.estimate_available_memory_mb()
        return available >= estimated_memory_mb

    def add_warning_callback(self, callback: Callable[[MemoryStats], None]) -> None:
        """Add callback for memory warning events."""
        self._warning_callbacks.append(callback)

    def add_eviction_callback(self, callback: Callable[[MemoryStats], None]) -> None:
        """Add callback for memory eviction events."""
        self._eviction_callbacks.append(callback)

    def start_monitoring(self) -> None:
        """Start continuous memory monitoring in background thread."""
        if self._monitoring:
            logger.warning("Memory monitoring already running")
            return

        self._monitoring = True
        self._shutdown_event.clear()

        self._monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            name="MemoryMonitor",
            daemon=True
        )
        self._monitor_thread.start()

        logger.info("Memory monitoring started")

    def stop_monitoring(self) -> None:
        """Stop continuous memory monitoring."""
        if not self._monitoring:
            return

        self._monitoring = False
        self._shutdown_event.set()

        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5.0)

        logger.info("Memory monitoring stopped")

    def _monitoring_loop(self) -> None:
        """Main monitoring loop running in background thread."""
        logger.debug("Memory monitoring loop started")

        last_warning_triggered = False
        last_eviction_triggered = False

        while self._monitoring and not self._shutdown_event.is_set():
            try:
                # Check memory pressure
                warning_exceeded, eviction_needed = self.check_memory_pressure()

                # Get current stats for callbacks
                stats = self.get_current_stats()

                # Trigger warning callbacks (only on state change)
                if warning_exceeded and not last_warning_triggered:
                    logger.warning(
                        f"Memory warning threshold exceeded: "
                        f"{stats.gpu_utilization_percent:.1f}% > {self.warning_threshold}%"
                    )
                    for callback in self._warning_callbacks:
                        try:
                            callback(stats)
                        except Exception as e:
                            logger.error(f"Warning callback failed: {e}")

                # Trigger eviction callbacks (only on state change)
                if eviction_needed and not last_eviction_triggered:
                    logger.error(
                        f"Memory eviction threshold exceeded: "
                        f"{stats.gpu_utilization_percent:.1f}% > {self.eviction_threshold}%"
                    )
                    for callback in self._eviction_callbacks:
                        try:
                            callback(stats)
                        except Exception as e:
                            logger.error(f"Eviction callback failed: {e}")

                # Update state tracking
                last_warning_triggered = warning_exceeded
                last_eviction_triggered = eviction_needed

                # Log periodic status (debug level)
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Memory status: {stats.to_dict()}")

            except Exception as e:
                logger.error(f"Error in memory monitoring loop: {e}")

            # Wait for next check or shutdown signal
            if self._shutdown_event.wait(timeout=self.check_interval):
                break

        logger.debug("Memory monitoring loop ended")

    def clear_gpu_cache(self) -> None:
        """Clear PyTorch GPU cache to free memory."""
        if self.cuda_available:
            try:
                torch.cuda.empty_cache()
                logger.info("GPU cache cleared")
            except Exception as e:
                logger.error(f"Failed to clear GPU cache: {e}")

    def get_memory_summary(self) -> Dict[str, Any]:
        """Get comprehensive memory summary for monitoring."""
        stats = self.get_current_stats()
        warning_exceeded, eviction_needed = self.check_memory_pressure()

        return {
            "stats": stats.to_dict(),
            "thresholds": {
                "warning_percent": self.warning_threshold,
                "eviction_percent": self.eviction_threshold,
                "warning_exceeded": warning_exceeded,
                "eviction_needed": eviction_needed,
            },
            "available_memory_mb": self.estimate_available_memory_mb(),
            "monitoring_active": self._monitoring,
            "cuda_available": self.cuda_available,
        }


# Global memory monitor instance
memory_monitor = MemoryMonitor()