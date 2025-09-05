---
mode: 'agent'
model: GPT-4.1
tools: ['githubRepo', 'searchResults', 'search', 'codebase']
description: 'Use this template to create detailed Jira stories for the Transact Agent UI project. Fill in each section with relevant information to ensure clarity and completeness. Return the completed story in markdown format.'
---

# Jira Story Prompt Template

## Details

### Problem

Clearly describe the issue or gap in current functionality.
Include context about where and how the problem manifests.

### Impact

Explain the user/business impact if the problem is not addressed.
Mention downstream effects, user confusion, errors, or support overhead.

### Scope

Define the boundaries of the work.
List affected components, flows, or services.
Explicitly exclude unrelated areas.

---

## Acceptance criteria
<!-- Define clear, testable acceptance criteria that cover all aspects of the story. Use the "Given/When/Then" format for clarity. -->

- Given [trigger/action], when [event/API call/validation], then [expected outcome in UI/state].
- Given [alternate trigger], when [alternate event], then [alternate expected outcome].
- Given [error/mismatch], when [failure detected], then [error handling and user feedback].
- Given [network/API failure], when [cannot determine state], then [fallback behaviour].
- All flows must be covered by unit and integration tests asserting both success and error/mismatch paths.
- Behaviour must use existing architecture patterns (e.g., RTK Query, SignalR, i18n) and not bypass established flows.

---

## Checklist
<!-- Provide a developer checklist to ensure all aspects of the story are covered. Break down tasks into manageable items. -->

### Inspect and modify:
<!-- Example descriptions are provided; adjust as needed for the specific story. -->

- [ ] `[filepath]` — ensure handlers perform required actions and state verification.
- [ ] `[filepath]` — add helpers for mutation, state fetch, and verification.
- [ ] `[filepath]` — confirm endpoints exist and support manual refetch; add if missing.
- [ ] `[filepath]` — ensure real-time updates reconcile with verification logic.

### Tests:
<!-- Tests should cover all acceptance criteria, including success and error paths. -->

- [ ] Unit: `[filepath]` — detail tests for all functions and components.
- [ ] Component: `[filepath]` — add tests for UI components covering all states and interactions.
- [ ] Integration: `[filepath]` — end-to-end tests covering user flows and edge cases.
- [ ] Ensure tests cover success, error, and edge cases for all acceptance criteria.

### General:
<!-- Add common tasks to ensure code quality and maintainability in this section. Be sure to include i18n and documentation updates. -->

- [ ] `[filepath]` — add/use i18n key for error messages and ensure modal/feedback is shown.
- [ ] Update translation files: `translation.json` — add relevant i18n keys and default strings.
- [ ] Lint and type checks passed (run: `npm run lint`, `npm run typecheck`)
- [ ] Follow import ordering and coding conventions from `.github/copilot-instructions.md`.
- [ ] Keep implementation hook-based and reuse existing endpoints.
- [ ] Use i18n via `next-intl` `useTranslations()` in UI components.
- [ ] Documentation updated (if applicable)


---

## Definition of Done

- [ ] All acceptance criteria satisfied and verified by automated tests.
- [ ] Unit, component, and integration tests added/updated and passing in CI.
- [ ] Error handling added with i18n keys and default English strings.
- [ ] Code follows repository import/order and architectural conventions.