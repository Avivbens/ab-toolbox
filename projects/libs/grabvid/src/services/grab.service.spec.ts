import { GrabError } from '../errors/grab.error.js';
import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import type { GrabOptions } from '../schemas/grab-options.schema.js';
import { interrupted } from '../utils/error.util.js';
import { discoverRenditions } from './discovery.service.js';
import { grab } from './grab.service.js';
import { fallBackToYtDlp } from './yt-dlp.service.js';

vi.mock('./discovery.service.js', () => ({ discoverRenditions: vi.fn() }));
vi.mock('./yt-dlp.service.js', () => ({ fallBackToYtDlp: vi.fn() }));

const options: GrabOptions = {
  url: 'https://site.example/watch/1',
  quality: 'best',
  interactive: false,
  listFormats: false,
  referer: 'auto',
  jobs: 8,
  maxSegments: 0,
  ua: 'test-agent',
  fallback: true,
};
const ctx = { ua: options.ua, signal: new AbortController().signal };

describe('grab', () => {
  beforeEach(() => {
    vi.mocked(fallBackToYtDlp).mockReset();
  });

  it('hands media grabvid cannot reach to yt-dlp', async () => {
    const reason = new MediaUnavailableError('no Referer worked');
    vi.mocked(discoverRenditions).mockRejectedValue(reason);

    await grab(options, ctx);

    expect(fallBackToYtDlp).toHaveBeenCalledWith(options, ctx, reason);
  });

  it('keeps the original error with --no-fallback', async () => {
    const reason = new MediaUnavailableError('no Referer worked');
    vi.mocked(discoverRenditions).mockRejectedValue(reason);

    await expect(grab({ ...options, fallback: false }, ctx)).rejects.toBe(reason);
    expect(fallBackToYtDlp).not.toHaveBeenCalled();
  });

  it.each([
    ['a user decision', new GrabError('stopped - clip.mp4.part left untouched')],
    ['an interrupt', interrupted()],
  ])('does not fall back on %s', async (_, error) => {
    vi.mocked(discoverRenditions).mockRejectedValue(error);

    await expect(grab(options, ctx)).rejects.toBe(error);
    expect(fallBackToYtDlp).not.toHaveBeenCalled();
  });
});
