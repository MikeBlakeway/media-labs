---
applyTo: 'docs/**,README.md,CHANGELOG.md,*.md'
description: 'Documentation standards and structure'
---

# Documentation Standards Instructions

## Documentation Structure and Organization

Maintain consistent documentation standards across all project documentation.

### File Organization Standards

#### Documentation Hierarchy

```
docs/
├── github/               # GitHub and AI-related documentation
├── runpod/              # RunPod integration documentation
│   ├── glossary.md      # Terminology and definitions
│   ├── development/     # Development workflows
│   ├── serverless/      # Serverless endpoint documentation
│   └── storage/         # Storage and volume documentation
├── reports/             # Analysis and evaluation reports
├── comfyui-worker/      # Worker-specific documentation
└── deployment/          # Deployment guides and procedures
```

#### Root-Level Documentation

- `README.md` - Main project overview and setup instructions
- `AGENTS.md` - AI agent guidance and project context
- `CHANGELOG.md` - Version history and changes
- `LICENSE` - Project licensing information

### Markdown Standards

#### Frontmatter Requirements

```yaml
---
ContentId: unique-identifier
DateApproved: MM/DD/YYYY
MetaDescription: Brief description for SEO and context
MetaSocialImage: relative/path/to/image.png
---
```

#### Heading Structure

```markdown
# Main Title (H1) - One per document

## Major Sections (H2)

### Subsections (H3)

#### Details (H4)

##### Minor Details (H5)

###### Footnotes (H6)
```

#### Code Block Standards

````markdown
# Specify language for syntax highlighting

```typescript
const example = 'Use language identifiers'
```
````

# Use descriptive comments

```bash
# Install dependencies
npm install
```

# Include file paths for context

```javascript
// src/lib/config.ts
export const config = {
  // Configuration
}
```

````

### Content Writing Guidelines

#### Grammar and Style Standards
- **Tense**: Use present tense verbs (is, create, run) instead of past tense
- **Voice**: Use active voice where the subject performs the action
- **Person**: Write in second person (you) to speak directly to readers
- **Clarity**: Write factual statements and direct commands
- **Conciseness**: Avoid hypotheticals like "could" or "would"

#### Technical Writing Patterns
```markdown
## Good Examples
- "Run the command to start the server"
- "This function handles user authentication"
- "Configure the environment variables"

## Avoid
- "You could run the command to start the server"
- "This function would handle user authentication"
- "You might want to configure the environment variables"
````

### Documentation Types and Templates

#### API Documentation Template

````markdown
## Endpoint Name

**Method**: POST
**Path**: `/api/endpoint`
**Description**: Brief description of what this endpoint does

### Request Schema

```typescript
{
  parameter1: string
  parameter2?: number
}
```
````

### Response Schema

```typescript
{
  data: ResultType
  status: 'success' | 'error'
}
```

### Example Usage

```bash
curl -X POST /api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"parameter1": "value"}'
```

````

#### Component Documentation Template
```markdown
## ComponentName

Brief description of component purpose and functionality.

### Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

### Usage Example
```tsx
<ComponentName
  prop1="value"
  prop2={42}
/>
````

### Related Components

- [RelatedComponent](./RelatedComponent.md)
- [AnotherComponent](./AnotherComponent.md)

````

#### Hook Documentation Template
```markdown
## useHookName

Brief description of hook purpose and functionality.

### Parameters
- `parameter1: Type` - Description of parameter
- `parameter2?: Type` - Optional parameter description

### Return Value
```typescript
{
  data: DataType | null
  loading: boolean
  error: string | null
  actions: {
    performAction: () => Promise<void>
  }
}
````

### Usage Example

```tsx
function Component() {
  const { data, loading, error, actions } = useHookName(param1, param2)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} />

  return <div>{data}</div>
}
```

````

### Cross-Reference Standards

#### Internal Linking Patterns
```markdown
# Relative links for internal documentation
[Release Process](../release/docs/strategy.md)

# Absolute links for external resources
[Next.js Documentation](https://nextjs.org/docs)

# Anchor links for same-document sections
[Configuration Section](#configuration)
````

#### Reference Lists

```markdown
## Related Resources

- [Main Project Documentation](../../README.md)
- [API Reference](../api/reference.md)
- [Development Guide](../development/setup.md)
- [Troubleshooting](../troubleshooting/common-issues.md)
```

### Code Example Standards

#### Inline Code

- Use backticks for: `filenames`, `variables`, `short code snippets`, `commands`
- Be specific: `src/components/Button.tsx` not just `Button component`

#### Code Blocks Requirements

````markdown
# Always specify language

```typescript
// Include relevant comments
const config = process.env.API_KEY
```
````

# Show complete, working examples

```bash
# Clone repository
git clone https://github.com/user/repo.git

# Install dependencies
cd repo
npm install

# Start development
npm run dev
```

# Include error handling where relevant

```typescript
try {
  const result = await apiCall()
  return result
} catch (error) {
  console.error('API call failed:', error)
  throw error
}
```

````

### Table Standards

#### Well-Formatted Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |

# For complex data, use descriptive headers
| Environment Variable | Required | Default Value | Description |
|---------------------|----------|---------------|-------------|
| RUNPOD_API_KEY      | Yes      | -             | RunPod API authentication key |
| DEBUG_MODE          | No       | false         | Enable debug logging |
````

### Version Control for Documentation

#### Change Documentation Requirements

- Update `DateApproved` in frontmatter when making significant changes
- Include change rationale in commit messages
- Link to related PR or issue numbers
- Update cross-references when moving or renaming files

#### Documentation Reviews

- Technical accuracy verification
- Grammar and style consistency check
- Link validation (internal and external)
- Code example testing

### README.md Specific Standards

#### Required README Sections

```markdown
# Project Name

Brief project description

## Features

- Key feature 1
- Key feature 2

## Quick Start

Essential setup steps

## Installation

Detailed installation instructions

## Usage

Basic usage examples

## Development

Development setup and workflows

## API Reference

Link to detailed API documentation

## Contributing

Contribution guidelines

## License

License information
```

### Changelog Standards

#### Version Entry Format

```markdown
## [Version] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes in existing functionality

### Deprecated

- Soon-to-be removed features

### Removed

- Removed features

### Fixed

- Bug fixes

### Security

- Security improvements
```

### Image and Media Guidelines

#### Image Requirements

- Use descriptive alt text
- Optimize file sizes (< 1MB for screenshots)
- Store in appropriate directories: `docs/images/`, `public/`
- Use relative paths for repository images

#### Screenshot Standards

```markdown
![Alt text describing the screenshot](../images/feature-screenshot.png)

_Caption: Descriptive caption explaining what the image shows_
```

### External Documentation Integration

#### Linking to External Resources

```markdown
# Always use HTTPS links

[Next.js Documentation](https://nextjs.org/docs)

# Include version numbers when relevant

[React 19 Documentation](https://react.dev/blog/2024/04/25/react-19)

# Use descriptive link text

[RunPod Serverless Documentation](https://docs.runpod.io/serverless)
```

### Accessibility in Documentation

#### Accessible Writing Practices

- Use clear, descriptive headings
- Provide alternative text for images
- Use sufficient color contrast in diagrams
- Structure content with proper heading hierarchy
- Include keyboard navigation instructions where relevant

### Documentation Validation

#### Pre-commit Checks

- Spell check completion
- Link validation (internal links work)
- Code example syntax verification
- Markdown linting compliance
- Image optimization verification

Refer to [Markdown Guide](https://www.markdownguide.org/) for syntax reference and [technical writing best practices](https://developers.google.com/tech-writing) for advanced techniques.
