import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatCount } from './format';

describe('formatRelativeTime', () => {
  it('should return "刚刚" for recent dates', () => {
    const recent = new Date().toISOString();
    expect(formatRelativeTime(recent)).toBe('刚刚');
  });

  it('should return minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 分钟前');
  });

  it('should return hours ago', () => {
    const twoHourAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(twoHourAgo)).toBe('2 小时前');
  });

  it('should return days ago', () => {
    const threeDayAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(formatRelativeTime(threeDayAgo)).toBe('3 天前');
  });

  it('should return formatted date for dates older than 7 days', () => {
    // Use a fixed date to avoid timezone issues with the comparison
    const oldDate = '2026-01-15T10:00:00.000Z';
    const result = formatRelativeTime(oldDate);
    // Should be YYYY-MM-DD format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatCount', () => {
  it('should return the number as string for values under 1000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('should format thousands with k suffix', () => {
    expect(formatCount(1000)).toBe('1.0k');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(1234)).toBe('1.2k');
  });

  it('should format ten-thousands with w suffix', () => {
    expect(formatCount(10000)).toBe('1.0w');
    expect(formatCount(25000)).toBe('2.5w');
    expect(formatCount(123456)).toBe('12.3w');
  });
});
