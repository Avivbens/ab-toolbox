import { GrabError } from '../errors/grab.error.js';
import { parseMasterPlaylist, parseMediaPlaylist } from './m3u8.parser.js';

const BASE = 'https://cdn.example/hls/master.m3u8';

describe('parseMasterPlaylist', () => {
  it('reads each variant with its resolution and bandwidth', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=700000,BANDWIDTH=800000,RESOLUTION=640x360',
      '360p/index.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=2500000',
      'https://other.example/720p/index.m3u8',
    ].join('\r\n');

    expect(parseMasterPlaylist(playlist, BASE)).toEqual([
      { url: 'https://cdn.example/hls/360p/index.m3u8', height: 360, bandwidth: 800000, size: undefined },
      { url: 'https://other.example/720p/index.m3u8', height: undefined, bandwidth: 2500000, size: undefined },
    ]);
  });

  it('ignores URIs that are not preceded by a stream tag', () => {
    expect(parseMasterPlaylist('#EXTM3U\nstray.m3u8', BASE)).toEqual([]);
  });
});

describe('parseMediaPlaylist', () => {
  it('numbers segments from the media sequence and tracks keys and the init map', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-MEDIA-SEQUENCE:5',
      '#EXT-X-MAP:URI="init.mp4"',
      '#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0xABCD',
      '#EXTINF:4,',
      'seg5.m4s',
      '#EXT-X-KEY:METHOD=AES-128,URI="https://keys.example/k2"',
      '#EXTINF:4,',
      'seg6.m4s',
      '#EXT-X-KEY:METHOD=NONE',
      '#EXTINF:4,',
      'seg7.m4s',
    ].join('\n');

    const { segments, initUrl } = parseMediaPlaylist(playlist, BASE);

    expect(initUrl).toBe('https://cdn.example/hls/init.mp4');
    expect(segments.map(({ url, seq }) => [url, seq])).toEqual([
      ['https://cdn.example/hls/seg5.m4s', 5],
      ['https://cdn.example/hls/seg6.m4s', 6],
      ['https://cdn.example/hls/seg7.m4s', 7],
    ]);
    expect(segments[0]?.key?.uri).toBe('https://cdn.example/hls/key.bin');
    expect(segments[0]?.key?.iv?.toString('hex')).toBe('0000000000000000000000000000abcd');
    expect(segments[1]?.key).toEqual({ uri: 'https://keys.example/k2', iv: undefined });
    expect(segments[2]?.key).toBeUndefined();
  });

  it('starts at sequence 0 without a media sequence tag', () => {
    expect(parseMediaPlaylist('#EXTM3U\na.ts\nb.ts', BASE).segments.map((s) => s.seq)).toEqual([0, 1]);
  });

  it('refuses encryption it cannot decrypt', () => {
    const playlist = '#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="k"\na.ts';
    expect(() => parseMediaPlaylist(playlist, BASE)).toThrow(GrabError);
  });
});
