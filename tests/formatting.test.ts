import { describe, it, expect } from 'vitest';
import { formatDuration, formatNumber } from '../src/utils/formatting';

describe('formatDuration', () => {
  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03');
    expect(formatDuration('PT2H30M45S')).toBe('2:30:45');
  });

  it('formats minutes and seconds only', () => {
    expect(formatDuration('PT5M30S')).toBe('5:30');
    expect(formatDuration('PT12M5S')).toBe('12:05');
  });

  it('formats seconds only', () => {
    expect(formatDuration('PT45S')).toBe('0:45');
    expect(formatDuration('PT5S')).toBe('0:05');
  });

  it('formats hours and minutes without seconds', () => {
    expect(formatDuration('PT1H30M')).toBe('1:30:00');
  });

  it('formats hours only', () => {
    expect(formatDuration('PT2H')).toBe('2:00:00');
  });

  it('formats minutes only', () => {
    expect(formatDuration('PT10M')).toBe('10:00');
  });

  it('returns original string for invalid format', () => {
    expect(formatDuration('invalid')).toBe('invalid');
    expect(formatDuration('')).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats numbers below 1000 without suffix', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(10000)).toBe('10K');
    expect(formatNumber(999999)).toBe('1000K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(10000000)).toBe('10M');
    expect(formatNumber(999999999)).toBe('1000M');
  });

  it('formats billions with B suffix', () => {
    expect(formatNumber(1000000000)).toBe('1B');
    expect(formatNumber(1500000000)).toBe('1.5B');
    expect(formatNumber(10000000000)).toBe('10B');
  });

  it('removes trailing .0 from formatted numbers', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(2000)).toBe('2K');
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1000000000)).toBe('1B');
  });
});
