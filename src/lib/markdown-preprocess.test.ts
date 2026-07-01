import { describe, expect, it } from 'vitest';
import { preprocessMd } from './markdown-preprocess';

describe('preprocessMd', () => {
  it('leaves well-formed math-only spans untouched', () => {
    expect(preprocessMd('closing speed is $50+70=120$ mph')).toBe('closing speed is $50+70=120$ mph');
    expect(preprocessMd('area is $\\pi r^2$')).toBe('area is $\\pi r^2$');
  });

  it('leaves plain-text currency untouched', () => {
    expect(preprocessMd('spends \\$250 on it')).toBe('spends \\$250 on it');
  });

  it('de-maths a $…$ span that contains an escaped \\$ (currency-in-math)', () => {
    // The span breaks remark-math; it becomes plain text with the dollar escaped.
    expect(preprocessMd('so $0.60\\times\\$250=\\$150$.')).toBe('so 0.60×\\$250=\\$150.');
    expect(preprocessMd('half of $\\$250$;')).toBe('half of \\$250;');
  });

  it('unwraps \\textit / \\textbf used outside math mode', () => {
    expect(preprocessMd('the amount \\textit{spent} here')).toBe('the amount spent here');
    expect(preprocessMd('\\textbf{at least} one')).toBe('at least one');
  });

  it('keeps a percent-only math span as math but de-maths a mixed currency span', () => {
    const out = preprocessMd('$40\\%$ of $\\$250=\\$100$');
    expect(out).toBe('$40\\%$ of \\$250=\\$100'); // first span math, second de-mathed
  });

  it('is a no-op for text with no math or commands', () => {
    expect(preprocessMd('just plain words.')).toBe('just plain words.');
  });
});
