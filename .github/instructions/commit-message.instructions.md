# Commit message instructions

This file documents how all commit messages must be structured for the media-labs repository and how Copilot (and contributors) must generate them.

## Summary

- All commit messages MUST follow Conventional Commits: <https://www.conventionalcommits.org/>.
- Commit headers (the first line) MUST be 100 characters or fewer.
- Commit bodies (when present) SHOULD wrap at ~72 characters and explain the "why" and any non-obvious implementation details.
- Use footers for issue references, breaking changes, or metadata (e.g. `BREAKING CHANGE:`).

## Required prompt and workflow

1. When creating a commit message, ALWAYS use the prompt located at
   `.github/prompts/commit_message.prompt.md` to generate the message. This applies to:

   - Messages suggested in chat with Copilot before a commit is made.
   - Automated commit message generation via the GitHub MCP server or any bot integration.

2. Insist that the human requester confirm the generated header fits the intent and that the header is <= 100 characters. If there is ambiguity about scope or wording, ask clarifying questions before committing.

3. Perform the repository preflight checks before committing: run the project's lint, tests, and (if relevant) build steps. If any of these fail, do not commit until failures are resolved or acknowledged by the requester.

## Conventional Commit header template

<type>(<scope>): <short description>

Where:

- type — one of: feat, fix, docs, style, refactor, perf, test, chore
- scope — optional package or module short name (e.g., `api`, `ui`, `worker`, `sdk`, `shared`, `docs`)
- short description — imperative, present-tense, concise (<=100 chars)

## Examples

- `feat(api): add audio job create endpoint`
- `fix(ui): handle null layout props`
- `docs(instructions): add commit message guidelines and prompt usage`

## Commit body guidance

- If the change needs more explanation, add a body explaining why the change was made and any important implementation notes.
- Wrap lines at ~72 characters.
- If the change introduces a breaking API change include a `BREAKING CHANGE:` footer and a short explanation.

## Automation and checks

- Generated messages MUST be validated against commitlint rules used by the repo (header length, type set, etc.).
- If the CI or local commit hooks indicate the message is invalid, correct it using the prompt and re-run the checks.

## Updating this document

If you add new templates or change the commit message policy, update this file and also update `.github/prompts/commit_message.prompt.md` so they remain aligned.

End of instructions.
