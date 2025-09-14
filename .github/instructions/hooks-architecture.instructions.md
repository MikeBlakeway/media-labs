---
applyTo: 'src/hooks/**,src/components/**'
description: 'Maintain hooks-based architecture separation'
---

# Hooks-Based Architecture Instructions

## Architecture Enforcement

Strictly maintain the completed hooks-based architecture refactor with clear separation of concerns.

### Architectural Boundaries

#### Hooks (Business Logic Layer)

- **Location**: `src/hooks/`
- **Responsibility**: All business logic, API calls, state management, and data processing
- **Requirements**: Must be pure logic, reusable, and testable

#### Components (Presentation Layer)

- **Location**: `src/components/`
- **Responsibility**: UI rendering, user interaction, and visual presentation only
- **Requirements**: Must consume hooks for data, no direct API calls

#### Lib (Utility Layer)

- **Location**: `src/lib/`
- **Responsibility**: Pure utility functions, schemas, types, and reusable logic
- **Requirements**: Framework-agnostic, no React dependencies

### Hook Categories and Conventions

#### Workflow Management Hooks

- `useWorkflowTemplate` - Template loading and metadata management
- `useWorkflowsList` - Workflow list fetching with error handling
- `useWorkflowRegistration` - Workflow registration with validation
- `useWorkflowManagement` - CRUD operations for workflows
- `useWorkflowEditor` - Workflow editing state management

#### Job & Execution Hooks

- `useJobManagement` - Job submission, polling, and result management
- `useWorkflowRunnerJob` - Job-specific execution and status tracking
- `useEnhancedPolling` - Robust polling with retry logic

#### Form & UI Hooks

- `useWorkflowForm` - Form state management and validation
- `useFieldLabeling` - Enhanced field labeling for workflows
- `useFileUpload` - File upload functionality
- `useUploadCard` - Upload card specific state management

#### Utility & Specialized Hooks

- `useManualPreflight` - Model preflight checks
- `useWorkflowPreflight` - Workflow-specific preflight validation
- `useResultHistory` - Result history management with filtering
- `useProgressCalculation` - Progress calculation utilities
- `useProgressTimer` - Progress timing functionality
- `useOutputProcessor` - Output processing logic
- `useResultsDisplay` - Results display state management
- `useWorkflowOutputType` - Determines output type (image/video)

### Component Restrictions

#### Prohibited in Components

- Direct `fetch()` calls or API requests
- Business logic or data processing
- Complex state management beyond UI state
- Direct imports from `src/lib/` for business logic
- Hardcoded API endpoints or business rules

#### Required in Components

- Import and use appropriate hooks for data needs
- Focus on JSX rendering and user interaction
- Use hooks for all async operations
- Delegate complex logic to custom hooks

### Hook Design Patterns

#### Standard Hook Structure

```typescript
export function useCustomHook() {
  const [state, setState] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performAction = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Business logic here
      const result = await apiCall()
      setState(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { state, loading, error, performAction }
}
```

#### Return Object Conventions

- Always return objects, not arrays
- Include loading and error states
- Provide clear action functions
- Use descriptive property names

### Component Design Patterns

#### Standard Component Structure

```typescript
interface ComponentProps {
  // Define props clearly
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Use hooks for all data needs
  const { data, loading, error, actions } = useAppropriateHook()

  // UI state only
  const [isExpanded, setIsExpanded] = useState(false)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} />

  return (
    // JSX focused on presentation
  )
}
```

### File Organization Rules

#### Hook Files

- One hook per file
- Export named function (not default)
- Include comprehensive JSDoc comments
- Co-locate related types with hooks

#### Component Files

- One component per file
- Export named function (not default)
- Keep components focused and small
- Use composition over inheritance

### Testing Requirements

#### Hook Testing

- Test all business logic in hooks
- Use `@testing-library/react-hooks` for hook testing
- Mock external dependencies
- Test error scenarios and edge cases

#### Component Testing

- Test rendering and user interactions
- Mock hook return values
- Focus on UI behavior, not business logic
- Use React Testing Library patterns

### Migration Guidelines

When modifying existing code:

1. Extract any business logic from components into hooks
2. Ensure components only handle presentation
3. Move API calls to appropriate hooks
4. Update imports to use new hook structure
5. Add proper error handling and loading states

### Architecture Validation

Before committing changes:

- Verify no direct API calls in components
- Confirm all business logic is in hooks
- Check proper separation of concerns
- Validate hook naming conventions
- Ensure proper error handling patterns

Refer to [hooks documentation](../../docs/hooks.md) for complete details.
