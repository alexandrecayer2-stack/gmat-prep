import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MOCK_CONFIG,
  MOCK_SHORT_COUNT,
  parseMockConfig,
  plannedQuestionCount,
  sectionSeconds,
  serializeMockConfig,
  targetCount,
  type MockConfig,
} from './mock';
import { SECTION_QUESTION_COUNT } from './constants';

describe('mock config — counts and timing', () => {
  it('full length mirrors the real GMAT section counts', () => {
    expect(targetCount('quant', 'full')).toBe(SECTION_QUESTION_COUNT.quant);
    expect(targetCount('verbal', 'full')).toBe(SECTION_QUESTION_COUNT.verbal);
    expect(targetCount('data_insights', 'full')).toBe(SECTION_QUESTION_COUNT.data_insights);
  });

  it('short length is a fixed 10 per section', () => {
    expect(targetCount('quant', 'short')).toBe(MOCK_SHORT_COUNT);
  });

  it('timed sections are 45 minutes; untimed is zero', () => {
    expect(sectionSeconds('quant', true)).toBe(45 * 60);
    expect(sectionSeconds('quant', false)).toBe(0);
  });

  it('planned count sums the selected sections', () => {
    const config: MockConfig = { sections: ['quant', 'verbal'], length: 'full', difficulty: 'balanced', timed: true };
    expect(plannedQuestionCount(config)).toBe(
      SECTION_QUESTION_COUNT.quant + SECTION_QUESTION_COUNT.verbal,
    );
  });
});

describe('mock config — URL round-trip', () => {
  it('serialize then parse is the identity for a normal config', () => {
    const parsed = parseMockConfig(serializeMockConfig(DEFAULT_MOCK_CONFIG));
    expect(parsed).toEqual(DEFAULT_MOCK_CONFIG);
  });

  it('normalizes section order to canonical regardless of input order', () => {
    const parsed = parseMockConfig({ sections: 'data_insights,quant', length: 'full', difficulty: 'balanced', timed: '1' });
    expect(parsed.sections).toEqual(['quant', 'data_insights']);
  });

  it('falls back to all sections and balanced/full/timed for junk input', () => {
    const parsed = parseMockConfig({ sections: 'bogus', length: 'xxl', difficulty: 'impossible', timed: undefined });
    expect(parsed.sections).toEqual(['quant', 'verbal', 'data_insights']);
    expect(parsed.length).toBe('full');
    expect(parsed.difficulty).toBe('balanced');
    expect(parsed.timed).toBe(true);
  });

  it('respects an explicit untimed + difficulty + short', () => {
    const parsed = parseMockConfig({ sections: 'verbal', length: 'short', difficulty: 'hard', timed: '0' });
    expect(parsed).toEqual({ sections: ['verbal'], length: 'short', difficulty: 'hard', timed: false });
  });
});
