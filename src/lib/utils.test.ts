import { describe, expect, it } from 'vitest';
import { cn, formatTime } from './utils';

describe('formatTime', () => {
  it('formats as M:SS with zero-padded seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });

  it('does not cap the minutes (long sessions)', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  it('floors fractional seconds and clamps negatives to 0:00', () => {
    expect(formatTime(59.9)).toBe('0:59');
    expect(formatTime(-10)).toBe('0:00');
  });
});

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false && 'b', 'c', null, undefined)).toBe('a c');
  });

  it('resolves conflicting Tailwind utilities (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});
