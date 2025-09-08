# Media Labs Codebase Refactoring Analysis

## Executive Summary

This document provides a comprehensive analysis of the current codebase and proposes a refactoring strategy to align with React/Next.js best practices. The goal is to move from monolithic components with embedded business logic to a hooks-based architecture with clear separation of concerns.

## Current State Analysis

### 🔍 Architecture Overview

The codebase currently follows a **mixed architecture** with varying levels of component complexity:

- **892-line main workflow component** (`src/app/w/[slug]/page.tsx`) with embedded business logic
- **222-line management component** (`src/app/manage/[slug]/page.tsx`) with CRUD operations
- **Mixed component patterns** - some pure UI, others with business logic
- **Single custom hook** (`useEnhancedPolling`) with well-defined responsibility
- **Good API layer** separation with proper Next.js App Router patterns

### 📊 Component Complexity Assessment

| Component                        | Lines | Concerns Mixed         | Refactor Priority |
| -------------------------------- | ----- | ---------------------- | ----------------- |
| `src/app/w/[slug]/page.tsx`      | 892   | 🔴 High (7+ concerns)  | **Critical**      |
| `src/app/manage/[slug]/page.tsx` | 222   | 🟡 Medium (4 concerns) | **High**          |
| `ProgressIndicator.tsx`          | 202   | 🟡 Medium (3 concerns) | **Medium**        |
| `WorkflowResults.tsx`            | 214   | 🟡 Medium (3 concerns) | **Medium**        |
| `ResultHistory.tsx`              | 327   | 🟡 Medium (4 concerns) | **Medium**        |
| `useEnhancedPolling.ts`          | 157   | 🟢 Low (1 concern)     | **Good** ✅       |

## 🚨 Critical Issues Identified

### 1. Monolithic Main Component (`src/app/w/[slug]/page.tsx`)

**Mixed Concerns:**

- **Data Fetching**: Template loading, workflow validation
- **Form Management**: Field state, validation, rendering
- **Job Management**: Submission, polling, status tracking
- **UI State**: Loading states, error handling, form interactions
- **File Uploads**: Multi-file handling, progress tracking
- **Result Processing**: Output display, history management
- **Navigation**: URL parameter handling, routing

**Example of Mixed Logic:**

```typescript
// Business logic mixed with UI rendering
const handleSubmit = async (e: React.FormEvent) => {
  // Form validation logic
  // API calls
  // State updates
  // Error handling
  // All mixed in event handler
}

// Component renders 50+ lines of JSX with embedded logic
return (
  <div>
    {/* Complex conditional rendering */}
    {/* Form field generation with business logic */}
    {/* Progress tracking with calculations */}
  </div>
)
```

### 2. State Management Complexity

**Current Pattern:**

```typescript
const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
const [formData, setFormData] = useState<Record<string, ValueUnion>>({})
const [errors, setErrors] = useState<string[]>([])
const [loading, setLoading] = useState(true)
const [submitting, setSubmitting] = useState(false)
const [jobId, setJobId] = useState<string | null>(null)
const [results, setResults] = useState<unknown | null>(null)
// ... 15+ useState calls
```

### 3. Lack of Separation Between Smart and Dumb Components

Most components handle both business logic and presentation, violating the single responsibility principle.

## 🎯 Proposed Architecture

### Component Hierarchy Strategy

```text
Smart Components (Container/Logic)
├── WorkflowPageContainer
├── WorkflowFormContainer
├── JobManagementContainer
└── ResultsContainer

Dumb Components (Presentation)
├── WorkflowForm
├── FormField
├── JobStatusDisplay
├── ProgressIndicator (refactored)
├── ResultsGallery
└── ErrorDisplay

Custom Hooks (Business Logic)
├── useWorkflowTemplate
├── useWorkflowForm
├── useJobManagement
├── useFileUpload
├── useResultHistory
└── useEnhancedPolling ✅
```

## 📋 Detailed Refactoring Plan

### Phase 1: Extract Business Logic Hooks

#### 1.1 Create `useWorkflowTemplate` Hook

**Purpose**: Handle template loading and caching
**Extracts from**: Main component template loading logic

```typescript
// hooks/useWorkflowTemplate.ts
export function useWorkflowTemplate(slug: string) {
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Template loading logic
  // Validation logic
  // Error handling

  return { template, loading, error, refetch }
}
```

#### 1.2 Create `useWorkflowForm` Hook

**Purpose**: Manage form state, validation, and field rendering logic
**Extracts from**: Main component form management

```typescript
// hooks/useWorkflowForm.ts
export function useWorkflowForm(template: WorkflowTemplate) {
  const [formData, setFormData] = useState<Record<string, ValueUnion>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // Form validation logic
  // Field value management
  // Submission preparation

  return {
    formData,
    errors,
    isDirty,
    updateField,
    validateForm,
    getSubmissionData
  }
}
```

#### 1.3 Create `useJobManagement` Hook

**Purpose**: Handle job submission, polling, and status management
**Extracts from**: Main component job handling logic

```typescript
// hooks/useJobManagement.ts
export function useJobManagement() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const polling = useEnhancedPolling({
    onComplete: handleJobComplete,
    onError: handleJobError
  })

  // Job submission logic
  // Status tracking
  // Result processing

  return {
    jobId,
    submitting,
    submitJob,
    cancelJob,
    ...polling
  }
}
```

#### 1.4 Create `useFileUpload` Hook

**Purpose**: Handle multi-file uploads with progress tracking
**Extracts from**: Main component file upload logic

```typescript
// hooks/useFileUpload.ts
export function useFileUpload() {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [uploading, setUploading] = useState(false)

  // File validation
  // Upload progress tracking
  // Error handling

  return {
    uploads,
    uploading,
    uploadFiles,
    removeUpload,
    clearUploads
  }
}
```

#### 1.5 Create `useResultHistory` Hook

**Purpose**: Manage result history loading and filtering
**Extracts from**: ResultHistory component business logic

```typescript
// hooks/useResultHistory.ts
export function useResultHistory(currentSlug: string) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'current'>('current')

  // History loading logic
  // Filtering logic
  // Cache management

  return {
    history,
    loading,
    filter,
    setFilter,
    refetch,
    downloadResult
  }
}
```

### Phase 2: Create Presentation Components

#### 2.1 Extract `WorkflowForm` Component

**Purpose**: Pure UI component for form rendering
**Props**: `{ template, formData, errors, onFieldChange, onSubmit }`

```typescript
// components/WorkflowForm.tsx
interface WorkflowFormProps {
  template: WorkflowTemplate
  formData: Record<string, ValueUnion>
  errors: string[]
  onFieldChange: (field: string, value: ValueUnion) => void
  onSubmit: (data: Record<string, ValueUnion>) => void
  disabled?: boolean
}

export function WorkflowForm({ template, formData, errors, onFieldChange, onSubmit, disabled }: WorkflowFormProps) {
  // Pure rendering logic only
  // No state management
  // No API calls
}
```

#### 2.2 Extract `FormField` Component

**Purpose**: Reusable form field renderer
**Props**: `{ field, value, onChange, error }`

```typescript
// components/FormField.tsx
interface FormFieldProps {
  field: WorkflowInputField
  value: ValueUnion
  onChange: (value: ValueUnion) => void
  error?: string
  disabled?: boolean
}

export function FormField({ field, value, onChange, error, disabled }: FormFieldProps) {
  // Field type rendering logic
  // No business logic
}
```

#### 2.3 Extract `JobStatusDisplay` Component

**Purpose**: Pure UI for job status and progress
**Props**: `{ status, progress, jobId, startTime }`

```typescript
// components/JobStatusDisplay.tsx
interface JobStatusDisplayProps {
  status: string
  progress?: number
  jobId?: string
  startTime?: number
  onCancel?: () => void
}

export function JobStatusDisplay({ status, progress, jobId, startTime, onCancel }: JobStatusDisplayProps) {
  // Pure status display
  // No polling logic
}
```

### Phase 3: Refactor Existing Components

#### 3.1 Refactor `ProgressIndicator` Component

**Current Issues:**

- Mixes time calculation logic with UI rendering
- Has embedded useEffect for timer management
- Calculates progress stages internally

**Proposed Split:**

```typescript
// hooks/useProgressCalculation.ts
export function useProgressCalculation(status: string, startTime?: number) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Timer logic
  // Progress calculation
  // Stage determination

  return { elapsedSeconds, currentStage, progress }
}

// components/ProgressIndicator.tsx (refactored)
interface ProgressIndicatorProps {
  status: string
  elapsedSeconds: number
  currentStage: ProgressStage
  progress: number
  jobId?: string
  attempts?: number
}

export function ProgressIndicator({
  status,
  elapsedSeconds,
  currentStage,
  progress,
  jobId,
  attempts
}: ProgressIndicatorProps) {
  // Pure rendering only
}
```

#### 3.2 Refactor `WorkflowResults` Component

**Current Issues:**

- Manages internal state for image selection
- Has embedded download logic
- Mixes result processing with UI

**Proposed Split:**

```typescript
// hooks/useResultsDisplay.ts
export function useResultsDisplay(output: WorkflowOutput) {
  const [selectedImage, setSelectedImage] = useState(0)

  // Image navigation logic
  // Download handling
  // Result processing

  return { selectedImage, setSelectedImage, downloadImage }
}

// components/WorkflowResults.tsx (refactored)
interface WorkflowResultsProps {
  output: WorkflowOutput | null
  status: string
  error?: string
  selectedImage: number
  onImageSelect: (index: number) => void
  onDownload: (imageIndex: number) => void
}
```

#### 3.3 Refactor `ResultHistory` Component

**Current Issues:**

- Manages API calls directly
- Has complex filtering logic
- Embeds modal state management

**Proposed Split:**

```typescript
// hooks/useResultHistory.ts (already planned)
// hooks/useResultModal.ts
export function useResultModal() {
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null)

  return { selectedResult, openModal: setSelectedResult, closeModal: () => setSelectedResult(null) }
}

// components/ResultHistory.tsx (refactored)
// components/ResultModal.tsx (new)
```

### Phase 4: Create Container Components

#### 4.1 `WorkflowPageContainer`

**Purpose**: Orchestrates all workflow page logic
**Replaces**: Current monolithic page component

```typescript
// containers/WorkflowPageContainer.tsx
export function WorkflowPageContainer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  // Use all hooks
  const template = useWorkflowTemplate(slug)
  const form = useWorkflowForm(template.template)
  const jobs = useJobManagement()
  const uploads = useFileUpload()
  const history = useResultHistory(slug)

  // Coordination logic only
  // Pass data to presentation components

  return (
    <div>
      <WorkflowForm {...form} template={template.template} />
      <JobStatusDisplay {...jobs} />
      <WorkflowResults {...results} />
      <ResultHistory {...history} />
    </div>
  )
}
```

## 🔧 Implementation Strategy

### Step-by-Step Migration Plan

#### Week 1: Hook Extraction

1. Create `useWorkflowTemplate` hook
2. Create `useWorkflowForm` hook
3. Test hooks in isolation

#### Week 2: Form Component Extraction

1. Create `FormField` component
2. Create `WorkflowForm` component
3. Integrate with existing page (hybrid approach)

#### Week 3: Job Management

1. Create `useJobManagement` hook
2. Create `JobStatusDisplay` component
3. Replace job logic in main component

#### Week 4: Results and History

1. Refactor `WorkflowResults` component
2. Extract `useResultHistory` hook
3. Create presentation components

#### Week 5: Container Integration

1. Create `WorkflowPageContainer`
2. Migrate main page to use container
3. Remove legacy code

#### Week 6: Polish and Optimization

1. Add error boundaries
2. Optimize re-renders
3. Add comprehensive testing

### Testing Strategy

#### Unit Tests

- Test each hook independently
- Test presentation components with mock props
- Test container orchestration logic

#### Integration Tests

- Test hook interactions
- Test form submission flows
- Test error scenarios

#### E2E Tests

- Test complete workflow execution
- Test file upload scenarios
- Test result viewing flows

### Performance Considerations

#### Optimization Techniques

1. **Memoization**: Use `useMemo` for expensive calculations
2. **Callback Stability**: Use `useCallback` for event handlers
3. **Component Splitting**: Reduce unnecessary re-renders
4. **State Collocation**: Keep state close to where it's used

#### Render Optimization

```typescript
// Before: Everything re-renders on any state change
const [template, setTemplate] = useState()
const [formData, setFormData] = useState()
const [jobStatus, setJobStatus] = useState()

// After: Isolated state updates
const template = useWorkflowTemplate(slug) // Only re-renders template UI
const form = useWorkflowForm(template) // Only re-renders form UI
const job = useJobManagement() // Only re-renders job UI
```

## 📈 Benefits Expected

### Developer Experience

- **Maintainability**: 50-80% reduction in component complexity
- **Testability**: Isolated hooks and components easier to test
- **Reusability**: Hooks can be shared across components
- **Debugging**: Clearer separation makes issues easier to locate

### Performance

- **Rendering**: Reduced unnecessary re-renders
- **Bundle Size**: Better tree shaking with smaller components
- **Memory**: More efficient state management

### Code Quality

- **Single Responsibility**: Each hook/component has one clear purpose
- **Type Safety**: Better TypeScript inference with smaller interfaces
- **Error Handling**: Centralized error boundaries and validation

## 🚧 Migration Risks & Mitigation

### Identified Risks

1. **Breaking Changes**: Large refactor could introduce bugs

   - **Mitigation**: Incremental migration with feature flags

2. **State Synchronization**: Complex state interactions might break

   - **Mitigation**: Comprehensive testing of hook interactions

3. **Performance Regressions**: New architecture might be slower

   - **Mitigation**: Performance monitoring and benchmarking

4. **Development Velocity**: Refactor might slow feature development
   - **Mitigation**: Parallel development tracks

### Rollback Strategy

1. **Feature Flags**: Enable/disable new architecture
2. **Gradual Migration**: Keep old components as fallbacks
3. **Monitoring**: Track performance and error metrics
4. **Quick Revert**: Ability to revert to previous version

## 🏁 Success Metrics

### Quantitative Goals

- **Component Size**: Average component size < 150 lines
- **Complexity**: Cyclomatic complexity < 10 per function
- **Test Coverage**: > 85% coverage for hooks and components
- **Performance**: No degradation in render times

### Qualitative Goals

- **Developer Satisfaction**: Easier to work with codebase
- **Bug Reduction**: Fewer issues in new features
- **Feature Velocity**: Faster development after migration
- **Code Review Quality**: Clearer, more focused reviews

## 🔄 Next Steps

1. **Review and Approval**: Team review of this analysis
2. **Prototype Development**: Create spike implementation of 1-2 hooks
3. **Architecture Validation**: Validate hook patterns work for use cases
4. **Implementation Planning**: Detailed timeline and resource allocation
5. **Migration Execution**: Begin step-by-step implementation

---

**Document Version**: 1.0
**Last Updated**: Current Date
**Review Status**: Pending Team Review
