import { describe, it, expect } from 'vitest'
import { highlightText } from '@/composables/useHighlight'

describe('highlightText', () => {
  it('wraps matching terms in <mark> tags', () => {
    const result = highlightText('Hello world', 'world')
    expect(result).toBe('Hello <mark>world</mark>')
  })

  it('highlights multiple query terms separately', () => {
    const result = highlightText('Vue is a framework', 'vue framework')
    expect(result).toBe('<mark>Vue</mark> is a <mark>framework</mark>')
  })

  it('is case-insensitive', () => {
    const result = highlightText('HELLO World', 'hello')
    expect(result).toBe('<mark>HELLO</mark> World')
  })

  it('escapes HTML special characters', () => {
    const result = highlightText('<script>alert("xss")</script>', 'script')
    // The HTML tags should be escaped, but "script" inside them should still be highlighted
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('<mark>script</mark>')
  })

  it('returns escaped original text for empty query', () => {
    const result = highlightText('<div>Hello</div>', '')
    expect(result).toBe('&lt;div&gt;Hello&lt;/div&gt;')
  })

  it('handles regex special characters in query safely', () => {
    const result = highlightText('test (parens) here', '(parens)')
    // Should not throw — parentheses are regex-escaped
    expect(result).toBe('test <mark>(parens)</mark> here')
  })

  it('highlights partial matches', () => {
    const result = highlightText('TypeScript is great', 'Type')
    expect(result).toBe('<mark>Type</mark>Script is great')
  })
})
