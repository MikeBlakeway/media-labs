# feat [{issue-number}]: add short-description max 72 characters

## Description

Add a descriptive summary of the changes made in this commit. Include the motivation for the change and any relevant context. For example, "This commit introduces a new responsive image component that automatically adjusts image sizes based on the viewport, improving load times and user experience."

### Files changed

- `apps/web/src/components/ExampleComponent.tsx`
- `apps/web/src/helpers/helper.ts`
- `apps/web/src/components/index.ts`
- `apps/web/src/components/test/UnitTest.tsx`
- `apps/web/src/components/test/IntegrationTest.tsx`
- `apps/web/src/helpers/test/Helper.test.ts`

## How to test

1. Run `npm run dev` and open the homepage.
2. Run `npm run test` and verify all tests pass.
3. Inspect the network tab to confirm images are lazy-loaded and in correct formats.

Resolves: #ISSUE-1234
