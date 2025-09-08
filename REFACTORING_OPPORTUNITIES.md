# Component Refactoring Opportunities

Based on analysis of the codebase, several components contained logic that duplicated functionality now available in our extracted hooks and utilities.

## ✅ COMPLETED: High Priority Refactoring

### 1. **`src/app/w/[slug]/page.tsx` (COMPLETED - 892 → 219 lines)**

**Status**: ✅ **COMPLETED** - Successfully refactored main workflow component

**Achieved Results**:

- **75.5% code reduction**: 892 lines → 219 lines
- **Complete separation of concerns**: All business logic moved to focused hooks
- **Improved maintainability**: Component now focused purely on UI orchestration
- **Validated architecture**: Proves our hook-based approach works for complex components

**Applied Refactoring**:

- ✅ Template loading → `useWorkflowTemplate`
- ✅ Form state management → `useWorkflowForm`
- ✅ Job submission and polling → `useJobManagement`
- ✅ File upload handling → `useFileUpload`
- ✅ Model preflight checks → `useWorkflowPreflight`
- ✅ Field label enhancement → `useFieldLabeling`
- ✅ Form field rendering → `FormField` component
- ✅ Job status display → `JobStatusDisplay` component
- ✅ Preflight status → `PreflightStatus` component

**Architecture Validation**:
The successful refactoring of this massive component validates our hook-based architecture and demonstrates that complex workflow logic can be cleanly separated and reused.

## Remaining Refactoring Targets

### 2. **`src/components/WorkflowRunner.tsx` (HIGH PRIORITY - 179 lines)**

**Status**: 🟡 Significant duplication in job management

**Duplicated Logic**:

- Manual job submission with `fetch('/api/workflows/patch-run')` → Replace with `useJobManagement.submitJob`
- Manual polling implementation (lines 73-85) → Replace with built-in polling from `useJobManagement`
- Basic status tracking (`setStatus`, `setJobId`) → Replace with comprehensive status from hook
- Simple status mapping → Use enhanced status display from `JobStatusDisplay`
- No result history storage → Automatic with `useJobManagement`

**Current Issues**:

```tsx
// Manual polling (lines 73-85)
const poll = async () => {
  const sres = await fetch(`/api/runpod/status/${data.id}`)
  const s = await sres.json()
  if (s.status === 'COMPLETED') {
    setStatus('completed')
    setImages(s.output?.images ?? null)
  } else if (s.status === 'FAILED') {
    setStatus('failed')
  } else {
    pollRef.current = window.setTimeout(poll, 2000)
  }
}
```

**Refactored Approach**:

```tsx
// Clean hook-based approach
const job = useJobManagement()
const handleSubmit = async () => {
  const patches = [{ nodeId, inputKey, value: workerPath }]
  await job.submitJob('workflow', patches) // Built-in polling, status, error handling
}
```

**Estimated Reduction**: 179 lines → ~80 lines (55% reduction)

### 3. **`src/components/UploadCard.tsx` (MEDIUM - 84 lines)**

**Status**: 🟢 Simple file upload duplication

**Duplicated Logic**:

- Manual file upload with `fetch('/api/volume/upload')` → Replace with `useFileUpload.uploadFile`
- Manual error state (`setError`, `error`) → Use error handling from hook
- Manual loading/result states → Use upload progress and status from hook
- Manual FormData construction → Handled automatically by hook

**Current Issues**:

```tsx
// Manual upload implementation (lines 20-35)
const fd = new FormData()
fd.append('file', file)
if (jobId.trim()) fd.append('jobId', jobId.trim())

const res = await fetch('/api/volume/upload', { method: 'POST', body: fd })
const data = await res.json()
if (!res.ok) {
  setError(data?.error || 'Upload failed')
  return
}
setResult(data as UploadResponse)
```

**Refactored Approach**:

```tsx
// Clean hook-based approach
const upload = useFileUpload()
const handleUpload = async () => {
  const workerPath = await upload.uploadFile(file, 'upload-card')
  // Automatic error handling, progress tracking, result management
}
```

**Estimated Reduction**: 84 lines → ~35 lines (60% reduction)

### 4. **`src/containers/WorkflowContainer.tsx` (ARCHITECTURE CONSOLIDATION)**

**Status**: ✅ Already using hooks - **CONSOLIDATION OPPORTUNITY**

**Discovery**: This component is already using our hook architecture! This creates an opportunity to:

1. **Evaluate both approaches**: Compare the refactored main page vs WorkflowContainer
2. **Consolidate patterns**: Choose the best approach and standardize
3. **Share improvements**: Ensure both benefit from the latest hook enhancements

**Analysis Needed**:

- Which implementation is more complete?
- Can we merge the best features of both?
- Should we standardize on one approach?

## New Refactoring Opportunities

### 5. **Client-Side Workflow Validation Hook**

**Target**: `src/app/api/workflows/validate/route.ts` logic → New `useWorkflowValidation` hook

**Opportunity**: Extract comprehensive workflow validation from API route to client-side hook

**Benefits**:

- Real-time validation feedback
- Reduced server requests
- Consistent validation across components

**Implementation**:

```tsx
const useWorkflowValidation = () => {
  // Extract validation logic from API route
  // Provide real-time validation
  // Return validation state and errors
}
```

### 6. **API Response Pattern Utilities**

**Target**: Repeated patterns across API routes

**Duplicated Patterns**:

- Zod validation with error formatting
- NextResponse.json with consistent error structure
- Try-catch with standardized error responses

**Solution**: Create API utilities library

```ts
// src/lib/api.utils.ts
export const validateRequestBody = (schema: ZodSchema, body: unknown) => {
  // Standardized validation with error formatting
}

export const createErrorResponse = (message: string, status: number) => {
  // Consistent error response format
}
```

### 7. **Duration Formatting Consolidation**

**Target**: Manual duration calculations across components

**Current Duplication**:

- `Math.round(duration / 1000)` patterns
- Manual time formatting in multiple places
- Inconsistent duration display formats

**Solution**: Use existing `formatDuration()` from `workflow.utils.ts`

**Locations to Update**:

- WorkflowRunner polling display
- Job status components
- Result history timestamps

### 8. **Status Display Pattern Consolidation**

**Target**: Manual status mapping and display logic

**Opportunity**: Replace manual status display with `JobStatusDisplay` component

**Locations**:

- WorkflowRunner status rendering
- Manual status icon/color logic
- Inconsistent status terminology

## Impact Assessment

### High Impact (75%+ code reduction)

1. ✅ **Main workflow page** (COMPLETED: 892 → 219 lines)
2. 🟡 **WorkflowRunner** (179 → ~80 lines)
3. 🟢 **UploadCard** (84 → ~35 lines)

### Medium Impact (Architecture improvement)

4. 📋 **WorkflowContainer consolidation** (Pattern standardization)
5. 🔧 **API utilities extraction** (DRY principle across routes)

### Low Impact (Quality of life)

6. 🎨 **Status display consolidation** (UI consistency)
7. ⏱️ **Duration formatting** (Display consistency)
8. ✅ **Client validation hook** (UX improvement)

## Next Steps Priority

1. **Refactor WorkflowRunner.tsx** to use `useJobManagement`
2. **Refactor UploadCard.tsx** to use `useFileUpload`
3. **Analyze WorkflowContainer.tsx** vs main page for consolidation
4. **Extract API utilities** for consistent server-side patterns
5. **Create useWorkflowValidation** for real-time client validation

```tsx
// Current approach
const [status, setStatus] = useState('idle')
const [jobId, setJobId] = useState<string | null>(null)
const pollRef = useRef<number | null>(null)

// New approach with hooks
const job = useJobManagement()
// All polling, status, and error handling built-in
```

### 3. **`src/components/UploadCard.tsx` (LOW - 84 lines)**

**Status**: 🟢 Simple file upload duplication

**Duplicated Logic**:

- File upload API calls → Replace with `useFileUpload`
- Error state management → Use error handling from hook
- Loading states → Use upload states from hook

**Refactoring Approach**:

```tsx
// Current approach
const [file, setFile] = useState<File | null>(null)
const [error, setError] = useState<string>('')
const onSubmit = async () => {
  /* manual fetch */
}

// New approach
const upload = useFileUpload()
const handleUpload = () => upload.uploadFile(file, 'upload-card')
```

## Utility Function Opportunities

### 1. **Duration Formatting** - Used in multiple places

**Locations**:

- `src/app/w/[slug]/page.tsx` (line ~610)
- Manual calculations: `Math.round(duration / 1000)`

**Solution**: Replace with `formatDuration()` from `workflow.utils.ts`

### 2. **Safe JSON Stringification** - Used for displaying unknown API responses

**Locations**:

- Various components displaying API results
- Error message formatting

**Solution**: Use `safeStringify()` from `workflow.utils.ts`

### 3. **Form Validation Logic** - Duplicated validation patterns

**Locations**:

- Manual validation in multiple components
- Required field checking

**Solution**: Use `validateSubmissionPrerequisites()` and form validation from hooks

## Implementation Priority

### Phase 1: Critical (Next Sprint)

1. **Refactor `src/app/w/[slug]/page.tsx`** using all extracted hooks
   - This validates our architecture completely
   - Massive code reduction and maintainability improvement
   - Template for future component migrations

### Phase 2: Medium Priority

2. **Refactor `WorkflowRunner.tsx`** to use `useJobManagement`
   - Cleaner job handling
   - Better error states
   - Consistent polling behavior

### Phase 3: Quick Wins

3. **Refactor `UploadCard.tsx`** to use `useFileUpload`
   - Simple replacement
   - Better upload state management
   - Consistent error handling

## Expected Benefits

### Code Reduction

- **Total lines eliminated**: ~1,100+ lines
- **Duplication reduction**: ~80%
- **Maintainability improvement**: Significant

### Consistency Improvements

- Unified job management patterns
- Consistent error handling
- Shared validation logic
- Common UI components

### Testing Benefits

- Hooks can be tested in isolation
- Components become simpler to test
- Shared logic tested once, used everywhere

## Migration Strategy

1. **Create backup branches** for each component before refactoring
2. **Start with `WorkflowContainer`** as the template/example
3. **Migrate `src/app/w/[slug]/page.tsx`** as the primary validation
4. **Update other components** following the established pattern
5. **Add integration tests** to ensure no functionality is lost

This refactoring will significantly improve codebase maintainability while validating our hooks-based architecture with real-world usage.
