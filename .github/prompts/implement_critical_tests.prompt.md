---
description: 'Implement critical priority tests based on the test coverage strategy report, focusing on highest-risk components with greatest business impact.'
mode: 'agent'
tools: [
    'codebase',
    'usages',
    'think',
    'problems',
    'changes',
    'testFailure',
    'terminalSelection',
    'terminalLastCommand',
    'fetch',
    'findTestFiles',
    'searchResults',
    'extensions',
    'editFiles',
    'search',
    'runCommands',
    'runTasks',
    'sequentialthinking',
    'markitdown'
  ]
---

# Implement Critical Tests Prompt

You are a specialist software development engineer and tester with 20+ years of experience in TypeScript, React, Jest, and comprehensive testing practices across various application domains.

## Task Overview

Analyze the generated `docs/testing_strategy.report.md` to identify the highest priority critical gaps and implement comprehensive tests for the most impactful areas. Focus on components marked as CRITICAL PRIORITY that pose the greatest risk to system integrity, security, and business operations.

## Phase 1: Priority Analysis & Target Selection

### Strategy Report Analysis

1. **Critical Gap Review**: Parse `docs/testing_strategy.report.md` for 🔴 CRITICAL PRIORITY items
2. **Impact Assessment**: Rank critical gaps by business impact and security risk
3. **Implementation Complexity**: Evaluate effort required vs. risk mitigation benefit
4. **Dependency Mapping**: Identify test dependencies and required mock infrastructure
5. **Standards Alignment**: Ensure compliance with `docs/testing-standards.md` patterns

### Target Selection Criteria

Select **maximum 3 critical components** using this prioritization framework:

- **Business Impact**: Components that directly affect core business operations
- **Risk Assessment**: Areas where failures could cause system-wide issues
- **Data Sensitivity**: Components handling sensitive or regulated data
- **User Impact**: Features critical to user experience and workflow
- **Compliance Requirements**: Areas subject to regulatory or security standards
- **Implementation Feasibility**: Achievable within single development session

## Phase 2: Test Implementation Strategy

### Pre-Implementation Validation

1. **Existing Test Review**: Check for partial coverage or related test patterns
2. **Mock Repository Analysis**: Identify reusable mocks in `src/test/mocks/`
3. **Component Dependencies**: Map all dependencies and required test setup
4. **Test Environment Setup**: Verify Jest configuration and testing utilities
5. **File Structure Compliance**: Ensure test files follow established directory patterns

### Implementation Protocol

For each selected critical component, adapt these templates to match your application domain:

#### High-Risk/Security Components

```typescript
// Template Structure for High-Risk Components
describe('ComponentName Critical Functionality', () => {
  // Setup and mocks using centralized repository
  beforeEach(() => {
    jest.clearAllMocks()
    // Use existing mocks from src/test/mocks/ or equivalent
  })

  describe('Core Functionality', () => {
    it('should handle primary use case correctly')
    it('should validate input data appropriately')
    it('should enforce business rules and constraints')
  })

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully')
    it('should recover from system failures')
    it('should maintain data integrity on errors')
  })

  describe('Edge Cases', () => {
    it('should handle boundary conditions')
    it('should manage resource constraints')
    it('should prevent cascading failures')
  })
})
```

#### Data Processing Components

```typescript
// Template Structure for Data Processing Tests
describe('DataProcessor Critical Operations', () => {
  // Use centralized mocks for external dependencies
  beforeEach(() => {
    jest.clearAllMocks()
    // Configure data processing mocks
  })

  describe('Data Validation', () => {
    it('should validate data integrity and format')
    it('should handle malformed or corrupted data')
    it('should enforce data constraints and rules')
  })

  describe('Processing Logic', () => {
    it('should process data according to business rules')
    it('should handle large datasets efficiently')
    it('should maintain consistency during operations')
  })

  describe('Integration Points', () => {
    it('should communicate with external systems correctly')
    it('should handle external system failures')
    it('should maintain data consistency across boundaries')
  })
})
```

### Test Quality Requirements

1. **Comprehensive Coverage**: Each test file must cover all public methods/props and critical paths
2. **Risk-Based Focus**: Prioritize testing scenarios that could cause business impact
3. **Mock Reusability**: Extend centralized mock repository, avoid duplication
4. **Error Scenarios**: Test failure modes and error recovery mechanisms
5. **Integration Points**: Verify component interactions and data flow
6. **Performance Validation**: Include performance assertions for critical paths
7. **Domain-Specific Validation**: Address requirements specific to your application domain

## Phase 3: Implementation Execution

### File Creation Protocol

1. **Directory Structure**: Create tests in dedicated `/test/` folders adjacent to source
2. **Naming Convention**: Follow `ComponentName.test.tsx` or `utility.test.ts` patterns
3. **Mock Integration**: Import and extend existing mocks from `src/test/mocks/`
4. **Documentation**: Include comprehensive test descriptions and security rationale
5. **Coverage Validation**: Ensure new tests increase overall coverage metrics

### Implementation Order

Execute based on the priority classification from your `testing_strategy.report.md`:

#### Identify Critical Components from Strategy Report

1. **Parse Report**: Extract components marked with 🔴 CRITICAL PRIORITY
2. **Risk Assessment**: Rank by potential business impact and system stability
3. **Implementation Planning**: Select top 3 components based on feasibility and impact

#### Generic Implementation Framework

**Priority 1: Highest Risk Component** (from strategy report analysis)

- **Target**: [Component identified from CRITICAL PRIORITY section]
- **Test File**: [Follow established directory structure patterns]
- **Focus**: Core functionality, error handling, business rule enforcement
- **Critical Tests**: Primary use cases, edge cases, failure scenarios

**Priority 2: Second Highest Risk Component**

- **Target**: [Second component from CRITICAL PRIORITY analysis]
- **Test File**: [Adjacent test directory following project conventions]
- **Focus**: Integration points, data validation, performance
- **Critical Tests**: Data integrity, external dependencies, resource management

**Priority 3: Third Critical Component**

- **Target**: [Third component from CRITICAL PRIORITY analysis]
- **Test File**: [Following established naming and directory patterns]
- **Focus**: User workflows, state management, cross-component interactions
- **Critical Tests**: User scenarios, state transitions, component communication

### Code Quality Standards

1. **TypeScript Strict Mode**: No `any` types, comprehensive type coverage
2. **Test Isolation**: Each test independent with proper setup/teardown
3. **Mock Consistency**: Use established patterns from existing test suite
4. **Error Validation**: Test both success and failure scenarios
5. **Documentation**: Clear test descriptions explaining security rationale
6. **Performance**: Tests complete within reasonable time limits

## Phase 4: Validation & Integration

### Test Execution Validation

1. **Individual Test Runs**: Verify each new test file passes independently
2. **Full Suite Integration**: Ensure new tests don't break existing coverage
3. **Coverage Impact**: Validate coverage increase for targeted components
4. **Performance Impact**: Monitor test execution time and memory usage
5. **CI/CD Integration**: Ensure tests pass in continuous integration environment

### Quality Assurance Checklist

- [ ] All tests follow established testing standards and patterns
- [ ] New mocks added to centralized repository (if applicable)
- [ ] No duplicate mocks or test patterns created
- [ ] Critical business scenarios comprehensively covered
- [ ] Error handling and edge cases tested
- [ ] Component integration points validated
- [ ] Performance assertions included where appropriate
- [ ] Test documentation explains business rationale and risk mitigation

### Success Metrics

- **Coverage Increase**: Minimum 10-15% increase in overall test coverage
- **Critical Component Coverage**: 90%+ coverage for implemented components
- **Risk Mitigation**: 100% of identified high-risk scenarios addressed
- **Business Logic Coverage**: All critical business workflows tested with error scenarios
- **Test Reliability**: All new tests pass consistently with 0% flake rate

## Expected Deliverables

1. **Test Implementation**: 3-5 comprehensive test files for critical components
2. **Mock Extensions**: Enhanced centralized mock repository
3. **Coverage Report**: Updated coverage metrics showing improvement
4. **Documentation**: Test rationale and security validation documentation
5. **Integration Validation**: Proof that new tests integrate with existing suite

## Success Criteria

- ✅ Critical high-risk components addressed with comprehensive tests
- ✅ Core business workflows covered with error scenarios
- ✅ Critical system integrations tested including failure modes
- ✅ All new tests follow established patterns and standards
- ✅ Coverage metrics show measurable improvement
- ✅ Test suite remains performant and reliable
- ✅ No breaking changes to existing test infrastructure

## Error Recovery & Troubleshooting

If implementation encounters issues:

1. **Dependency Conflicts**: Review component dependencies and mock requirements
2. **Test Failures**: Analyze root cause and adjust test approach
3. **Coverage Issues**: Verify test targets align with source code structure
4. **Performance Problems**: Optimize test setup and mock usage
5. **Integration Failures**: Check compatibility with existing test patterns

## Next Steps Integration

After successful implementation:

1. **Coverage Monitoring**: Set up tracking for implemented component coverage
2. **Risk Validation**: Schedule regular reviews of high-risk component testing
3. **Business Logic Testing**: Establish ongoing validation of critical workflows
4. **Team Integration**: Share patterns and approaches with development team
5. **Continuous Improvement**: Plan next iteration of critical test implementation

This prompt ensures immediate risk mitigation while establishing sustainable testing patterns that can be extended across any codebase, regardless of application domain.
