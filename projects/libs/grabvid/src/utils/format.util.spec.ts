import { formatBytes, formatDuration, formatSpeed } from './format.util.js';

describe('formatBytes', () => {
  it.each([
    [512, '512.00B'],
    [1536, '1.50KiB'],
    [5 * 1024 ** 3, '5.00GiB'],
    [2 * 1024 ** 5, '2048.00TiB'],
  ])('formats %d', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('formatSpeed', () => {
  it('pads known speeds and labels unknown ones', () => {
    expect(formatSpeed(2048)).toBe('   2.00KiB/s');
    expect(formatSpeed(undefined)).toBe('Unknown B/s');
  });
});

describe('formatDuration', () => {
  it('shows hours only when needed', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
