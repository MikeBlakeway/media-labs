# EPIC-008 — Observability, Metrics & Logging

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Instrument services with metrics, traces, and centralized logging; provide dashboards and alerts so teams can monitor job throughput, failures, and resource usage.

## Acceptance criteria / Definition of Done

- Metrics exposed for job lifecycle (submitted, running, succeeded, failed) and processing durations.
- Centralized logs available (structured) and correlated with job_id and request IDs.
- Dashboards for SLOs and alerts for high error rates, high queue length, or resource saturation.

## High-level story breakdown

- **STORY-008.1 — Metrics instrumentation** (3)

  - Add Prometheus metrics in API and worker; expose job counters, durations, and resource gauges.

- **STORY-008.2 — Centralized logging** (3)

  - Send structured logs to a central collector (e.g., Loki/Elasticsearch) with job context.

- **STORY-008.3 — Dashboards & alerts** (4)

  - Build Grafana dashboards for job health and configure alerting rules for key thresholds.

- **STORY-008.4 — Tracing & sampling** (3)
  - Add distributed tracing (OpenTelemetry) to trace job orchestration across services.

## Acceptance & QA checklist

- Generate synthetic load and verify metrics update and alerts fire at configured thresholds.
- Inspect traces to follow a sample job end-to-end and confirm logs correlate to spans.

## Dependencies & notes

- Requires instrumented services (EPIC-002 workers and API) and storage for metrics/logs.
- Start with lightweight OSS stack for local/dev (Prometheus + Grafana + Loki).

## Estimates

- Rough story points: 13

## How to convert into Jira

- Create tickets for each STORY-008.\* with dashboard definitions and alert thresholds; tag: observability.
