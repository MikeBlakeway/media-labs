.PHONY: help test test-unit test-smoke test-all services-up services-down

help:
	@echo "Available targets:"
	@echo "  test-unit    - Run unit tests only"
	@echo "  test-smoke   - Run smoke tests (requires services)"
	@echo "  test-all     - Run all tests"
	@echo "  services-up  - Start backend and ComfyUI services"
	@echo "  services-down - Stop all services"

# Start services for testing
services-up:
	docker compose up -d --build comfyui backend

# Stop services
services-down:
	docker compose down -v

# Run unit tests (no external dependencies)
test-unit:
	cd backend && python -m pytest tests/ -v -m "not smoke"

# Run smoke tests (requires services to be running)
test-smoke: services-up
	@echo "Waiting for services to be ready..."
	@timeout 60 bash -c 'until curl -f http://localhost:8000/health; do sleep 2; done' || (echo "Backend not ready" && exit 1)
	@timeout 90 bash -c 'until curl -f http://localhost:8188/; do sleep 3; done' || (echo "ComfyUI not ready" && exit 1)
	cd backend && BACKEND_URL=http://localhost:8000 python -m pytest tests/ -v -m smoke

# Run all tests
test-all: test-unit test-smoke

# Just run tests without service management (for CI or when services already running)
test:
	cd backend && python -m pytest tests/ -v
