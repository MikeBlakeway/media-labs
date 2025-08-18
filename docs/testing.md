# Testing

This project includes both unit tests and smoke tests for the backend API.

## Test Categories

- **Unit tests** (`@pytest.mark.unit`): Fast tests that don't require external services
- **Smoke tests** (`@pytest.mark.smoke`): Integration tests that require running services

## Running Tests Locally

### Prerequisites

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt
```

### Quick Commands

Using the provided Makefile:

```bash
# Run only unit tests (fast, no services needed)
make test-unit

# Run only smoke tests (requires services to be running)
make test-smoke

# Run all tests
make test-all

# Start services manually
make services-up

# Stop services
make services-down
```

### Manual Commands

From the `backend/` directory:

```bash
# Unit tests only
python -m pytest tests/ -v -m "not smoke"

# Smoke tests only (requires services running)
python -m pytest tests/ -v -m smoke

# All tests
python -m pytest tests/ -v
```

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:

1. Builds and starts the ComfyUI and backend services
2. Waits for services to be ready
3. Runs unit tests first
4. Runs smoke tests against the running services
5. Shows service logs on failure
6. Cleans up containers

The workflow runs on:
- Pushes to `main`
- Pull requests to `main`

## Test Structure

- `backend/tests/test_health.py` - Unit test for the `/health` endpoint
- `backend/tests/test_smoke_comfyui.py` - Smoke test that posts a minimal ComfyUI prompt
- `backend/pytest.ini` - Pytest configuration with custom markers

## Smoke Test Details

The smoke test:

1. Checks if the backend `/health` endpoint is reachable
2. Skips the test if the backend is not healthy
3. Posts a minimal LoadImage → PreviewImage prompt to `/generate`
4. Asserts HTTP 200 response with a `prompt_id` field

This validates the full end-to-end flow: HTTP request → FastAPI → ComfyUI → response.
