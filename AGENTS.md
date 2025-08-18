# AGENTS — AI agent rules & responsibilities

This file summarizes the rules and responsibilities for automated agents (Copilot-like) working on this repository. It is a concise, machine-friendly version of the guidelines in `.github/copilot-instructions.md` and the project runbooks.

Key rules

- Use the chosen MVP deployment (Option A): Vercel frontend, RunPod GPU instances for ComfyUI, Cloudflare R2 for storage, Supabase for metadata.
- Preserve public APIs and keep edits minimal. When adding or updating dependencies run the security analysis step described below.
- Do not download model weights or external assets requiring manual license acceptance without explicit human confirmation.

Codacy & security checks (required steps after edits)

1. After editing any code or adding dependencies run the Codacy CLI analyze step for each file changed. Set `rootPath` to the repository root.
2. For dependency changes (e.g., `package.json`, `requirements.txt`), run a Trivy scan and address any HIGH/CRITICAL findings before continuing.
3. If Trivy or other scanners report vulnerabilities, propose and apply fixes. Stop other work until fixes are applied.

Agent responsibilities when making changes

- Keep edits minimal and non-destructive. Use small commits with descriptive messages.
- Add or update unit tests for new behavior when practical (happy path + 1 edge case). Run tests locally.
- Update `docs/models-licenses.md` when adding new model weights or pipelines.
- When editing `.github/copilot-instructions.md` or `AGENTS.md`, ensure consistency and do not remove required Codacy instructions.

Escalation

- If Codacy CLI or the MCP server isn't available, document the failure in an issue and notify the repo owner.

Contact

- Repository owner: MikeBlakeway

--
Generated: 2025-08-18
