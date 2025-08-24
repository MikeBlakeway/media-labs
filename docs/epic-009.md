# EPIC-009 — Security, Auth & Rate Limiting

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Establish authentication, authorization, rate limiting, and secrets practices to protect the API, storage, and worker endpoints.

## Acceptance criteria / Definition of Done

- Authentication (OAuth2/JWT or equivalent) required for protected API endpoints.
- RBAC or scoped tokens for operations like uploading LoRAs, approving models, and administrative actions.
- Rate limiting applied per-user and per-IP to key endpoints, with documented throttling behavior.
- Secrets stored securely (vault/secret manager) and not committed to repo.

## High-level story breakdown

- **STORY-009.1 — Authentication system** (3)

  - Implement token-based auth (JWT/OIDC) and middleware in API to verify tokens.

- **STORY-009.2 — RBAC & scopes** (3)

  - Define roles (admin, user, service) and enforce permissions on endpoints.

- **STORY-009.3 — Rate limiting & abuse protection** (2)

  - Add configurable rate limits and throttling for submission and signed-URL endpoints.

- **STORY-009.4 — Secrets & key management** (2)

  - Use a secrets manager for credentials and rotate keys; document secret onboarding.

- **STORY-009.5 — Audit logging** (2)
  - Record admin actions (approvals, rejects) and critical security events in an audit log.

## Acceptance & QA checklist

- Verify protected endpoints reject anonymous requests and respect RBAC rules.
- Simulate high request rates and confirm throttling works as configured.

## Dependencies & notes

- Integrates with EPIC-006 (LoRA uploads) and EPIC-003 (signed URLs).
- Consider third-party identity providers for user auth in production.

## Estimates

- Rough story points: 12

## How to convert into Jira

- Create Jira tickets for each STORY-009.\* with acceptance criteria and test steps; tag: security, auth.
