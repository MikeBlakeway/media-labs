export function slugify(input: string): string {
  const base = input.replace(/\.[^.]+$/, '') // drop extension
  return (
    base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // non-alnum → dash
      .replace(/^-+|-+$/g, '') // trim dashes
      .slice(0, 64) || 'workflow'
  )
}
