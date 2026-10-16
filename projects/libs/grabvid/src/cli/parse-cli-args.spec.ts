import { DEFAULT_JOBS, DEFAULT_UA } from '../constants/app.constants.js';
import { GrabError } from '../errors/grab.error.js';
import { parseCliArgs } from './parse-cli-args.js';

const argv = (...args: string[]) => ['node', 'grabvid', ...args];

describe('parseCliArgs', () => {
  it('applies the defaults', async () => {
    await expect(parseCliArgs(argv('https://site.example/watch/1'))).resolves.toEqual({
      url: 'https://site.example/watch/1',
      quality: 'best',
      interactive: false,
      listFormats: false,
      referer: 'auto',
      jobs: DEFAULT_JOBS,
      maxSegments: 0,
      ua: DEFAULT_UA,
      fallback: true,
    });
  });

  it('turns the yt-dlp fallback off with --no-fallback', async () => {
    await expect(parseCliArgs(argv('https://site.example/watch/1', '--no-fallback'))).resolves.toMatchObject({
      fallback: false,
    });
  });

  it('reads short flags', async () => {
    const options = await parseCliArgs(
      argv('https://site.example/watch/1', '-q', '720p', '-F', '-o', 'out.mp4', '-r', 'none', '-j', '2', '-n', '5'),
    );
    expect(options).toMatchObject({
      quality: 720,
      listFormats: true,
      output: 'out.mp4',
      referer: 'none',
      jobs: 2,
      maxSegments: 5,
    });
  });

  it('names the offending flags and prints the usage', async () => {
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const parsing = parseCliArgs(argv('https://site.example/watch/1', '--jobs', '0', '--max-segments', 'x'));

    await expect(parsing).rejects.toThrow(GrabError);
    await expect(parsing).rejects.toThrow('--jobs must be at least 1\n    --max-segments must be an integer');
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('grabvid <url>'));
    stderr.mockRestore();
  });
});
