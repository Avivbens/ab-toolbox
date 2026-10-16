import { qualitySchema } from './quality.schema.js';

describe('qualitySchema', () => {
  it.each([
    ['best', 'best'],
    ['worst', 'worst'],
    ['720', 720],
    ['1080p', 1080],
    ['4k', 2160],
    ['8K', 4320],
  ])('parses %s', (raw, expected) => {
    expect(qualitySchema.parse(raw)).toBe(expected);
  });

  it.each(['999x', '72', 'high', ''])('rejects %j', (raw) => {
    const result = qualitySchema.safeParse(raw);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('must be best, worst or a height');
  });
});
