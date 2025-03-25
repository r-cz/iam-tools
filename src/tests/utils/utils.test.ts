import { describe, expect, test } from 'bun:test';
import { cn } from '../../lib/utils';

describe('Utils', () => {
  test('cn function should merge class names correctly', () => {
    // Test with simple strings
    expect(cn('class1', 'class2')).toBe('class1 class2');
    
    // Test with conditional classes
    expect(cn('always', false && 'never', true && 'sometimes')).toBe('always sometimes');
    
    // Test with undefined values
    expect(cn('defined', undefined, 'also-defined')).toBe('defined also-defined');
    
    // Test with object notation (if tailwind-merge is used)
    const result = cn('base', {
      'conditional-true': true,
      'conditional-false': false
    });
    
    expect(result).toContain('base');
    expect(result).toContain('conditional-true');
    expect(result).not.toContain('conditional-false');
  });
});
