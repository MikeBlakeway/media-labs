# Dark Mode Theming Guide

This document outlines the dark mode theming system implementation in Media Labs and provides guidelines for adding new components with proper dark mode support.

## Overview

The Media Labs application implements a comprehensive dark mode theming system with:

- **CSS Custom Properties**: Semantic color tokens that automatically adapt to theme changes
- **Class-based Theme Control**: Manual theme toggle with localStorage persistence
- **System Preference Fallback**: Automatic dark mode based on `prefers-color-scheme`
- **Smooth Transitions**: Animated theme switching for better user experience

## Architecture

### CSS Variables System

The theming system uses CSS custom properties defined in `src/app/globals.css`:

```css
:root {
  /* Light mode colors (default) */
  --background: #ffffff;
  --foreground: #171717;
  --panel: #f8fafc;
  --card: #ffffff;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  /* ... more tokens */
}

:root.dark,
.dark {
  /* Dark mode overrides */
  --background: #0b0f1a;
  --foreground: #e6eef8;
  --panel: #1e293b;
  --card: #0f172a;
  --border: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  /* ... more tokens */
}
```

### Theme Control

The `DarkModeToggle` component (`src/components/DarkModeToggle.tsx`) provides:

- Manual theme switching via toggle button
- localStorage persistence of user preference
- Fallback to system preference when no stored choice exists
- Smooth theme transitions

### Utility Classes

Custom utility classes are defined to work with CSS variables:

```css
.bg-card {
  background-color: var(--card);
}
.bg-panel {
  background-color: var(--panel);
}
.text-primary {
  color: var(--text-primary);
}
.text-secondary {
  color: var(--text-secondary);
}
.text-muted {
  color: var(--text-muted);
}
.border-default {
  border-color: var(--border);
}
```

## Adding Dark Mode Support to Components

### Method 1: CSS Variables (Recommended)

Use the custom utility classes that automatically adapt:

```tsx
// ✅ Good - uses semantic tokens
<div className='bg-card border border-default p-4'>
  <h3 className='text-primary'>Title</h3>
  <p className='text-secondary'>Description text</p>
  <span className='text-muted'>Helper text</span>
</div>
```

### Method 2: Tailwind Dark Mode Classes

Use Tailwind's `dark:` prefix for specific overrides:

```tsx
// ✅ Good - explicit dark mode classes
<div className='bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'>
  <p className='text-gray-700 dark:text-slate-100'>Content</p>
</div>
```

### What to Avoid

```tsx
// ❌ Bad - hardcoded colors without dark variants
<div className="bg-white border-gray-300">
  <p className="text-gray-700">This won't work in dark mode</p>
</div>

// ❌ Bad - inline styles that don't adapt
<div style={{ backgroundColor: '#ffffff', color: '#000000' }}>
  Hard-coded colors
</div>
```

## Color Token System

### Base Colors

- `--background` - Page background
- `--foreground` - Primary text color
- `--panel` - Panel/section backgrounds
- `--card` - Card backgrounds
- `--border` - Default border color

### Text Colors

- `--text-primary` - Primary headings and important text
- `--text-secondary` - Body text and labels
- `--text-muted` - Helper text, placeholders
- `--text-placeholder` - Input placeholder text

### Interactive Colors

- `--primary` - Primary buttons and links
- `--primary-hover` - Hover state for primary elements
- `--primary-foreground` - Text on primary backgrounds

### Status Colors

- `--success` / `--success-bg` / `--success-border` - Success states
- `--error` / `--error-bg` / `--error-border` - Error states
- `--warning` / `--warning-bg` / `--warning-border` - Warning states

## Component Examples

### Form Field

```tsx
<div className='bg-card border border-default rounded-lg p-4'>
  <label className='text-secondary text-sm font-medium'>Field Label</label>
  <input className='bg-input border border-input text-primary dark:bg-slate-800 dark:border-slate-600' />
  <p className='text-muted text-xs'>Help text</p>
</div>
```

### Status Badge

```tsx
<div className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded'>
  Success Status
</div>
```

### Button

```tsx
<button className='bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded transition-colors'>
  Primary Action
</button>
```

## Testing Dark Mode

### Unit Tests

Test that components use the correct CSS classes:

```typescript
describe('Component Dark Mode', () => {
  it('should use proper dark mode classes', () => {
    const classes = 'bg-card text-primary dark:bg-slate-800'
    expect(classes).toContain('dark:')
  })
})
```

### Visual Testing

1. Toggle dark mode using the theme toggle in the header
2. Verify all text is readable with sufficient contrast
3. Check that all interactive elements are visible
4. Ensure status indicators (success, error, warning) are distinguishable

### Accessibility Testing

- Text should meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text)
- Focus indicators should be visible in both themes
- Status colors should not rely solely on color (use icons/text as well)

## Best Practices

1. **Use Semantic Tokens**: Prefer `text-primary` over `text-gray-900`
2. **Test Both Modes**: Always verify components work in light and dark themes
3. **Maintain Consistency**: Use the established token system rather than creating new colors
4. **Consider Accessibility**: Ensure sufficient contrast ratios in both modes
5. **Progressive Enhancement**: Components should work without JavaScript (CSS-only theming)

## Troubleshooting

### Text Not Visible in Dark Mode

- Check if using hardcoded light colors like `text-gray-700`
- Switch to semantic tokens like `text-secondary` or add `dark:text-slate-100`

### Borders Invisible in Dark Mode

- Replace `border-gray-300` with `border-default` or `dark:border-slate-600`

### Cards Blend into Background

- Use `bg-card` instead of `bg-white`
- Ensure proper contrast between card and panel backgrounds

### Status Colors Too Subtle

- Use the predefined status color combinations (e.g., `bg-red-50 dark:bg-red-900/20`)
- Ensure status indicators use both color and text/icons

## Migration Guide

To update existing components:

1. **Identify hardcoded colors** (search for `bg-white`, `text-gray-`, etc.)
2. **Replace with semantic tokens** where possible
3. **Add dark: prefixes** for specific cases
4. **Test in both modes** using the theme toggle
5. **Verify accessibility** with sufficient contrast

This theming system provides a robust foundation for maintaining consistent, accessible dark mode support across the entire application.
