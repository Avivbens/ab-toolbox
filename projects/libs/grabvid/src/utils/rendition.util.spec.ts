import type { Rendition } from '../schemas/rendition.schema.js';
import { chooseRendition, heightFromText, preferredRendition, qualityLabel } from './rendition.util.js';

const at = (height: number | undefined, bandwidth?: number): Rendition => ({
  url: `https://cdn.example/${height}-${bandwidth}.mp4`,
  height,
  bandwidth,
});

describe('heightFromText', () => {
  it.each([
    ['/video_1080p.mp4', 1080],
    ['/clip-720p60.mp4', 720],
    ['/clip-4k.mp4', 2160],
    ['/abc720p.mp4', undefined],
    ['/1080/index.mp4', undefined],
  ])('reads %s', (label, expected) => {
    expect(heightFromText(label)).toBe(expected);
  });
});

describe('chooseRendition', () => {
  const renditions = [at(720), at(360), at(1080)];

  it('picks the extremes for best and worst', () => {
    expect(chooseRendition(renditions, 'best')?.height).toBe(1080);
    expect(chooseRendition(renditions, 'worst')?.height).toBe(360);
  });

  it('picks the best rendition at or under a height cap', () => {
    expect(chooseRendition(renditions, 800)?.height).toBe(720);
    expect(chooseRendition(renditions, 720)?.height).toBe(720);
  });

  it('falls back to the smallest rendition when everything is above the cap', () => {
    expect(chooseRendition(renditions, 240)?.height).toBe(360);
  });

  it('breaks height ties by bandwidth, then keeps the first listed', () => {
    const low = at(720, 1000);
    const high = at(720, 2000);
    expect(chooseRendition([low, high], 'best')).toBe(high);

    const first = at(undefined);
    expect(chooseRendition([first, at(undefined)], 'best')).toBe(first);
  });

  it('throws through preferredRendition when there is nothing to pick', () => {
    expect(chooseRendition([], 'best')).toBeUndefined();
    expect(() => preferredRendition([], 'best')).toThrow('no media candidates found');
  });
});

describe('qualityLabel', () => {
  it('prefers height, then bandwidth', () => {
    expect(qualityLabel({ height: 720, bandwidth: 1_500_000 })).toBe('720p');
    expect(qualityLabel({ bandwidth: 1_500_000 })).toBe('1500kbps');
    expect(qualityLabel({})).toBeUndefined();
  });
});
