# Minimal Makefile for volume-worker

.PHONY: lint test

test:
lint:
	flake8 handler.py test_volume_worker.py > test-results/lint.log || true

test:
	python3 -m unittest discover -s . > test-results/test.log || true
