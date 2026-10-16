import { grabOptionsSchema } from './grab-options.schema.js';

const valid = {
  url: 'https://example.com/watch/1',
  quality: 'best',
  referer: 'auto',
  jobs: 8,
  maxSegments: 0,
  ua: 'test-agent',
  fallback: true,
};

describe('grabOptionsSchema', () => {
  it('keeps the options and strips yargs extras', () => {
    const parsed = grabOptionsSchema.parse({
      ...valid,
      _: [],
      $0: 'grabvid',
      quality: '1080p',
      'list-formats': true,
      listFormats: true,
      F: true,
    });

    expect(parsed).toEqual({
      url: 'https://example.com/watch/1',
      quality: 1080,
      interactive: false,
      listFormats: true,
      referer: 'auto',
      jobs: 8,
      maxSegments: 0,
      ua: 'test-agent',
      fallback: true,
    });
  });

  it.each(['auto', 'none', 'https://referer.example/page'])('accepts referer %s', (referer) => {
    expect(grabOptionsSchema.safeParse({ ...valid, referer }).success).toBe(true);
  });

  it.each([
    ['url', { url: 'not-a-url' }],
    ['referer', { referer: 'foo' }],
    ['jobs', { jobs: 0 }],
    ['jobs', { jobs: 1.5 }],
    ['jobs', { jobs: Number.NaN }],
    ['maxSegments', { maxSegments: -1 }],
    ['output', { output: '' }],
  ])('rejects a bad %s', (key, override) => {
    const result = grabOptionsSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([key]);
  });
});
