import { partialSourceSchema } from './partial-source.schema.js';

describe('partialSourceSchema', () => {
  it('reads a sidecar record and drops unknown keys', () => {
    expect(partialSourceSchema.parse({ url: 'https://cdn.example/v.mp4', height: 720, total: 100, size: 5 })).toEqual({
      url: 'https://cdn.example/v.mp4',
      height: 720,
      total: 100,
    });
  });

  it('allows height and total to be missing', () => {
    expect(partialSourceSchema.parse({ url: 'https://cdn.example/v.mp4' })).toEqual({
      url: 'https://cdn.example/v.mp4',
    });
  });

  it.each([{}, { url: 1 }, { url: 'https://cdn.example/v.mp4', height: '720' }, null])('rejects %j', (record) => {
    expect(partialSourceSchema.safeParse(record).success).toBe(false);
  });
});
