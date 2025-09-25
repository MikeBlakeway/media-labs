# Minimal Makefile for volume-worker

.PHONY: lint test

test: lint
	python3 -m unittest discover -s . > test-results/test.log || true

lint:
	flake8 handler.py test_volume_worker.py > test-results/lint.log || true
