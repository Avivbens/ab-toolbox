import { DEFAULT_UA } from '../constants/app.constants.js';
import type { GrabOptions } from '../schemas/grab-options.schema.js';
import { toYtDlpRendition, ytDlpDownloadArgs, ytDlpInfoArgs } from './yt-dlp.util.js';

const URL = 'https://site.example/watch/1';
const TEMPLATE = '[grabvid] %(title)s%(height& - {}p|)s.%(ext)s';

const options: GrabOptions = {
  url: URL,
  quality: 'best',
  interactive: false,
  listFormats: false,
  referer: 'auto',
  jobs: 8,
  maxSegments: 0,
  ua: DEFAULT_UA,
  fallback: true,
};

describe('ytDlpDownloadArgs', () => {
  it("keeps yt-dlp's own choice and headers for the defaults", () => {
    expect(ytDlpDownloadArgs(options, false)).toEqual([
      '-o',
      TEMPLATE,
      '--merge-output-format',
      'mp4',
      '-N',
      '8',
      '--',
      URL,
    ]);
  });

  it.each([
    ['worst', ['-f', 'wv*+wa/w']],
    [720, ['-S', 'res:720']],
  ] as const)('maps --quality %s', (quality, expected) => {
    expect(ytDlpDownloadArgs({ ...options, quality }, false).slice(0, 2)).toEqual(expected);
  });

  it('saves into a directory under the default name, or to an exact file with % escaped', () => {
    expect(ytDlpDownloadArgs({ ...options, output: 'videos/' }, true)).toEqual(
      expect.arrayContaining(['-P', 'videos/', '-o', TEMPLATE]),
    );
    expect(ytDlpDownloadArgs({ ...options, output: 'clip 100%.mp4' }, false)).toEqual(
      expect.arrayContaining(['-o', 'clip 100%%.mp4']),
    );
  });

  it('passes on only the Referer and User-Agent the user set', () => {
    const args = ytDlpDownloadArgs({ ...options, referer: 'https://ref.example/', ua: 'custom-agent' }, false);
    expect(args).toEqual(expect.arrayContaining(['--referer', 'https://ref.example/', '--user-agent', 'custom-agent']));
    expect(ytDlpDownloadArgs({ ...options, referer: 'none' }, false)).not.toContain('--referer');
  });

  it('only lists formats for -F', () => {
    expect(ytDlpDownloadArgs({ ...options, listFormats: true }, false)).toEqual(['-F', '--', URL]);
  });

  it('downloads a picked format, adding the best audio only when the format has none', () => {
    const videoOnly = toYtDlpRendition({ format_id: 'hls-720', acodec: 'none' });
    const muxed = toYtDlpRendition({ format_id: '18', acodec: 'mp4a.40.2' });
    expect(ytDlpDownloadArgs(options, false, videoOnly).slice(0, 2)).toEqual(['-f', 'hls-720+ba/hls-720']);
    expect(ytDlpDownloadArgs(options, false, muxed).slice(0, 2)).toEqual(['-f', '18']);
  });
});

describe('ytDlpInfoArgs', () => {
  it('asks for the info JSON with the same request headers', () => {
    expect(ytDlpInfoArgs({ ...options, ua: 'custom-agent' })).toEqual([
      '-J',
      '--no-warnings',
      '--user-agent',
      'custom-agent',
      '--',
      URL,
    ]);
  });
});

describe('toYtDlpRendition', () => {
  it('maps yt-dlp units onto grabvid quality fields, treating unknown audio as missing', () => {
    expect(
      toYtDlpRendition({ format_id: 'hls-480', height: 480, tbr: 1500.5, filesize: null, filesize_approx: 9000 }),
    ).toMatchObject({ height: 480, bandwidth: 1500500, size: 9000, hasAudio: false });
  });
});
