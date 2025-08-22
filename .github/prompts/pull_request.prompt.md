---
mode: 'agent'
model: GPT-4o
tools: ['githubRepo', 'codebase']
description: 'GitHub PR template for contributors and Copilot agents. Enforces Conventional Commit titles and avoids raw filenames on standalone lines.'
---

# Pull Request Prompt

## Summary

Provide a short, capitalized summary matching the commit title:
Type(scope): Short summary (<=50 chars)

## Description

More detailed explanatory text (wrap ~72 chars). Explain what changed and why.

## Changes

- Bullet-point list of notable changes
- Keep entries concise

## How to test / QA

1. Step one to reproduce or test
2. Commands to run
3. Expected results

## Checklist

- [ ] Tests added / updated
- [ ] Lint and type checks passed (run: `npm run lint`, `npm run typecheck`)
- [ ] Documentation updated (if applicable)
- [ ] CI passes locally where possible

## Files changed (examples)

- `.github/copilot-instructions.md`
- `.github/workflows/copilot-setup-steps.yml`
- `docs/how-to-develop.md`

## Related issues / refs

Resolves: #123 <!-- optional -->

---

### Notes for contributors:

- Keep the PR body at least 20 characters long so the repository check passes.
- Do not put filenames on their own lines; use a bullet list or inline code instead.
- If your change modifies workflows, Husky, or Git LFS behavior, explicitly call out follow-ups (e.g., update workflow cache keys, run `git lfs install --skip-smudge`).
