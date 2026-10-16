import { defaultName, outputName, truncateUtf8 } from './filename.util.js';

describe('outputName', () => {
  it('tags the title with the tool and quality', () => {
    expect(outputName('My Clip', { height: 720 })).toBe('[grabvid] My Clip | 720p.mp4');
    expect(outputName('My Clip', {})).toBe('[grabvid] My Clip.mp4');
  });

  it('swaps path separators for look-alikes and strips control characters and leading dots', () => {
    expect(outputName('..a/b\\c:d\u0007', {})).toBe('[grabvid] a⧸b⧹c：d.mp4');
  });

  it('falls back to "video" when nothing usable is left', () => {
    expect(outputName('...', {})).toBe('[grabvid] video.mp4');
  });

  it('keeps the title within 200 bytes without splitting a character', () => {
    const name = outputName('é'.repeat(150), {});
    expect(name).toBe(`[grabvid] ${'é'.repeat(100)}.mp4`);
  });
});

describe('truncateUtf8', () => {
  it('cuts on character boundaries and trims trailing space', () => {
    expect(truncateUtf8('ab cd', 3)).toBe('ab');
    expect(truncateUtf8('😀😀', 6)).toBe('😀');
    expect(truncateUtf8('short', 100)).toBe('short');
  });
});

describe('defaultName', () => {
  it('names the file after the last path segment', () => {
    expect(defaultName('https://site.example/watch/clip-01.html?x=1')).toBe('clip-01');
    expect(defaultName('https://cdn.example/a/master.m3u8')).toBe('master');
  });

  it('falls back to "video"', () => {
    expect(defaultName('https://site.example/')).toBe('video');
  });
});
