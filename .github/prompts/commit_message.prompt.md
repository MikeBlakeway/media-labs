---
mode: 'agent'
model: GPT-4o
tools: ['githubRepo', 'codebase']
description: 'Generate a Conventional Commit style commit message and a safe PR body for this repository.'
---

# Commit Message Prompt

Your task is to generate a single, well-formed conventional-commit style commit message plus a matching PR body that will pass the repository "Check PR Description" validation.

## Behavior and constraints

- Always produce a commit title following Conventional Commits: Type(scope): Short summary
  - Type must be one of: feat, fix, chore, docs, style, refactor, perf, test, ci, build
  - Scope is optional but preferred when it clarifies the change (e.g., web, api, infra)
  - Summary should be in imperative mood, capitalized, and 50 characters or less.
- If a body is present, separate it with one blank line and wrap lines to ~72 characters.
- Do not place raw filenames on their own lines anywhere in the PR body or commit message (some CI scripts attempt to execute bare lines). Instead list files as a bulleted list or inline code fenced list.
- Ensure the PR body has at least 20 characters so it passes the repo check.
- If the change adds dependencies or modifies CI/Husky/LFS, explicitly mention CI impact and any required follow-ups.
- If the change modifies hooks or workflows, warn that CI workflows may need updates and include testing steps to validate them.

## Output format

Return two sections exactly, separated by a single blank line. Do NOT include any additional commentary.

1. Commit message (as a plain text block). The first line is the commit title. If there's a body, include it after a blank line.

2. PR body (as Markdown). Provide a meaningful description, bullet-pointed file list, testing/QA steps, and an optional "Resolves:" line.

### Example desired output

```
feat(web): add responsive image component

## Description

Add a new ResponsiveImage component that lazy-loads images and
supports modern formats (AVIF/WebP). Uses native loading="lazy"
and the project's Image wrapper to normalize srcsets.

### Files changed:
	- `apps/web/src/components/ResponsiveImage.tsx`
	- `apps/web/src/components/index.ts`

## How to test

1. Run `npm run dev` and open the homepage.
2. Verify images load as AVIF/WebP when supported.

Resolves: #123
```

### If required information is missing

- Ask the user for: commit Type (feat/fix/...), optional scope, short imperative summary, a brief body (why), and the list of changed files.
- If the user only provides a diff or partial list of files, extract a short, safe bulleted list of changed paths and include it in the PR body.

## Safety hints for generated PR bodies

- Never print a bare filename on its own line. Use bullets or inline code.
- Avoid shell meta-characters at the start of lines that could be misinterpreted by a Bourne shell.

## QA checklist to include in the PR body when relevant

- [ ] Lint and type checks passed (`npm run lint`, `npm run typecheck`)
- [ ] Local build succeeded (`npm run build`)
- [ ] If Python deps changed: `pip install -r services/api/requirements.txt` and run API tests
- [ ] If workflows or Husky hooks changed: run the relevant workflow locally or in a feature branch and verify hooks do not block expected CI runs

## Prompting guidance

- If the user asks "Write a commit message for these changes", and they paste a diff or list of files, generate the commit + PR body based on the diff. If uncertain about the commit type, ask a single clarifying question: "Is this a feat, fix, chore, docs, or other?"
- Keep commit messages short and focused; save long implementation notes for the PR body.
