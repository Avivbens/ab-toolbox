import { createRequire } from 'node:module';
import yargs from 'yargs';
import { DEFAULT_JOBS, DEFAULT_UA, TOOL_NAME } from '../constants/app.constants.js';
import { packageJsonSchema } from '../schemas/package-json.schema.js';

const { version } = packageJsonSchema.parse(createRequire(import.meta.url)('../../package.json'));

const SAMPLE_PAGE = 'https://example.com/watch/123';

/** Declares the CLI surface only: values are validated afterwards by `grabOptionsSchema`. */
export function createCli(args: readonly string[]) {
  const cli = yargs(args);
  return cli
    .scriptName(TOOL_NAME)
    .command('$0 <url>', 'Download the video behind a page or media URL', (command) =>
      command.positional('url', { type: 'string', describe: 'Page URL, or a direct .m3u8 / .mp4 URL' }),
    )
    .options({
      quality: {
        alias: 'q',
        type: 'string',
        default: 'best',
        describe: 'best, worst, or a max height such as 720, 1080p or 4k',
        group: 'Selection:',
      },
      interactive: {
        alias: 'i',
        type: 'boolean',
        describe: 'Pick the quality from a menu (the cursor starts on the --quality pick)',
        group: 'Selection:',
      },
      'list-formats': {
        alias: 'F',
        type: 'boolean',
        describe: 'List the available qualities and exit',
        group: 'Selection:',
      },
      output: {
        alias: 'o',
        type: 'string',
        describe: 'Output .mp4 path, or a directory (existing, or ending in /) to save under the default name',
        defaultDescription: `"[${TOOL_NAME}] <title> | <quality>.mp4"`,
        group: 'Output:',
      },
      referer: {
        alias: 'r',
        type: 'string',
        default: 'auto',
        describe: 'auto (probe until the CDN answers), none, or an explicit Referer URL',
        group: 'Network:',
      },
      jobs: {
        alias: 'j',
        type: 'number',
        default: DEFAULT_JOBS,
        describe: 'Parallel HLS segment downloads',
        group: 'Network:',
      },
      'max-segments': {
        alias: 'n',
        type: 'number',
        default: 0,
        describe: 'Cap HLS segments, 0 = all (handy for a quick preview)',
        group: 'Network:',
      },
      ua: {
        type: 'string',
        default: DEFAULT_UA,
        defaultDescription: 'desktop Chrome',
        describe: 'User-Agent header',
        group: 'Network:',
      },
      fallback: {
        type: 'boolean',
        default: true,
        describe:
          'Hand the URL to yt-dlp (when installed) if grabvid cannot find or fetch the media; --no-fallback to turn off',
        group: 'Fallback:',
      },
    })
    .conflicts('interactive', 'list-formats')
    .example([
      [`$0 ${SAMPLE_PAGE}`, 'Download the best quality'],
      [`$0 ${SAMPLE_PAGE} -i`, 'Pick the quality from a menu'],
      [`$0 ${SAMPLE_PAGE} -F`, 'List the available qualities'],
      [`$0 ${SAMPLE_PAGE} -q 720 -n 5`, 'Quick preview: 720p or below, first 5 HLS segments'],
    ])
    .epilogue(
      'Requires curl and ffmpeg on PATH. An interrupted direct download resumes from <output>.part; ' +
        'if the selected file no longer matches what the .part holds, you are asked before anything is touched.',
    )
    .strict()
    .help()
    .alias('help', 'h')
    .version(version)
    .wrap(Math.min(110, cli.terminalWidth() || 110));
}
