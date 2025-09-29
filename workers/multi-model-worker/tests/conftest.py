"""
Test configuration and setup for MMI-004 routing infrastructure tests.

This file configures pytest and provides common test utilities.
"""

import pytest
import sys
import os
from unittest.mock import Mock

# Add source directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Test configuration
pytest_plugins = []

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment before running tests."""
    # Ensure clean test environment
    import logging
    logging.getLogger().handlers.clear()

    # Set test configuration
    os.environ['TESTING'] = 'true'
    os.environ['LOG_LEVEL'] = 'DEBUG'

    yield

    # Cleanup after tests
    if 'TESTING' in os.environ:
        del os.environ['TESTING']
    if 'LOG_LEVEL' in os.environ:
        del os.environ['LOG_LEVEL']

@pytest.fixture
def mock_model_manager():
    """Fixture providing a mock ModelManager."""
    from models.model_manager import ModelManager

    mock_manager = Mock(spec=ModelManager)
    mock_manager.get_memory_stats.return_value = {
        "available_vram_gb": 16.0,
        "total_vram_gb": 24.0,
        "gpu_utilization": 30.0
    }
    mock_manager._loaded_models = {}

    return mock_manager

@pytest.fixture
def sample_text_to_image_request():
    """Fixture providing a sample text-to-image request."""
    return {
        "prompt": "A beautiful sunset over mountains with purple clouds",
        "steps": 4,
        "guidance_scale": 1.0,
        "width": 1024,
        "height": 1024
    }

@pytest.fixture
def sample_image_to_video_request():
    """Fixture providing a sample image-to-video request."""
    return {
        "image_url": "https://example.com/test-image.jpg",
        "duration": 4,
        "fps": 24
    }

@pytest.fixture
def invalid_request():
    """Fixture providing an invalid request for error testing."""
    return {
        "steps": 100,  # Invalid: out of range
        "guidance_scale": 1.0
        # Missing required prompt
    }

# Test markers
pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning")