# Branching policy

This repository follows a lightweight branching strategy intended to be easy
to follow for small teams and solo development. If you prefer a different
model (GitFlow, trunk-based, etc.) we can adapt this document.

## Core rules

- The `main` branch is the canonical, always-deployable branch. Protect it
  in the remote (require reviews, CI green, and status checks before merge).

- Create short-lived topic branches for work. Topic branches should be
  created off `main`.

## Branch naming conventions

- `feature/<short-descriptive-name>` — new features or larger user-visible
  changes.

- `fix/<short-desc>` — bug fixes.

- `chore/<short-desc>` — maintenance, tooling, docs, or chore work.

- `hotfix/<short-desc>` — fixes that must be applied urgently to `main`.

## Pull request & review rules

- Open a PR from the topic branch into `main`. Include a short description
  of the change, link to related issues, and testing notes.

- Require at least one approving review before merging.

- CI must pass all relevant checks (linters, tests, security scans) before
  merging. Squash merge is preferred for small changes; for larger or
  multi-commit features keep history linear via rebase where practical.

## Merging and releases

- Use protected-branch settings to prevent direct pushes to `main`.

- For releases you can either tag commits on `main` or introduce a
  `release/` branch pattern if you need staged releases (not required here).

## Hotfix flow

- Create `hotfix/<short-desc>` off `main`, implement and test, then PR to
  `main`. Merge quickly after approvals and CI. Cherry-pick to other
  branches if needed.

## Best practices

- Keep topic branches short-lived and focused on a single purpose.

- Rebase local work onto `main` to resolve conflicts before opening a PR
  (or use the GitHub PR rebase option when merging).

- Use clear, imperative commit messages and include a brief body for any
  non-trivial change.

## Document updates

- If you want this policy changed, open a PR against `main` with the
  proposed edits to `docs/branching.md` and the rationale.

## Example commands

```bash
# create a feature branch
git checkout -b feature/add-upload-ui main

# push branch and open a PR
git push -u origin feature/add-upload-ui
```
