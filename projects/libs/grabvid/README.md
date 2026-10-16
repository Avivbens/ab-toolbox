# @ab-toolbox/grabvid

Download videos and HLS streams from pages that block yt-dlp, with an interactive quality picker and resumable downloads.

Some hosts fingerprint yt-dlp's HTTP stack and answer it with a 403 while plain curl gets through, bury the real `.m3u8` behind iframes and packed JavaScript, and sign media tokens for one specific (often empty) Referer. `grabvid` sends every request through the system `curl`, walks the page to find the media, and probes Referer strategies until the CDN answers.

## Requirements

- Node.js 22.13+
- `curl` and `ffmpeg` on your `PATH`
- Optional: [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) on your `PATH`, used as a fallback (see below)

## Install

```bash
npm install --global @ab-toolbox/grabvid
```

## Usage

```bash
grabvid <url> [options]
```

`<url>` is either a page that embeds a player or a direct `.m3u8` / `.mp4` URL.

```bash
grabvid https://example.com/watch/123              # download the best quality
grabvid https://example.com/watch/123 -i           # pick the quality from a menu
grabvid https://example.com/watch/123 -F           # list the available qualities
grabvid https://example.com/watch/123 -q 720 -n 5  # quick preview: 720p or below, first 5 HLS segments
```

### Options

| Option                   | Default                              | Description                                                                                    |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `-q, --quality <q>`      | `best`                               | `best`, `worst`, or a max height such as `720`, `1080p` or `4k`                                |
| `-i, --interactive`      |                                      | Pick the quality from a menu, starting on the `--quality` pick                                 |
| `-F, --list-formats`     |                                      | List the available qualities and exit                                                          |
| `-o, --output <path>`    | `[grabvid] <title> \| <quality>.mp4` | Output `.mp4` path, or a directory (existing, or ending in `/`) to save under the default name |
| `-r, --referer <mode>`   | `auto`                               | `auto` (probe until the CDN answers), `none`, or a Referer URL                                 |
| `-j, --jobs <n>`         | `8`                                  | Parallel HLS segment downloads                                                                 |
| `-n, --max-segments <n>` | `0`                                  | Cap HLS segments, `0` = all                                                                    |
| `--ua <user-agent>`      | desktop Chrome                       | User-Agent header                                                                              |
| `--no-fallback`          |                                      | Do not hand the URL to yt-dlp when grabvid cannot get the media                                |

### How it finds the video

1. Fetches the page and looks for `.m3u8` / `.mp4` URLs in the HTML and in any Dean Edwards packed JavaScript.
2. If none are found, follows iframes, meta refreshes and JavaScript redirects (up to 4 levels deep).
3. Probes the media with no Referer, then the page, the page origin and the media origin, and keeps the first one the CDN accepts.
4. Picks a rendition by `--quality` (or lets you pick with `-i`). An HLS master playlist gets a second round over its variants.

### Downloads

- **HLS** - segments are fetched in parallel, AES-128 segments are decrypted, and `ffmpeg` remuxes the result into an `.mp4`.
- **Direct mp4** - downloaded into `<output>.part`. If you interrupt it (Ctrl+C), rerunning the same command resumes where it stopped. A `.part.json` sidecar records which file the `.part` holds. If you then select a different file for the same output, you are asked to restart, resume the original, or quit, so two videos never get spliced into one.

### yt-dlp fallback

When grabvid cannot find or fetch the media itself, it hands the URL to `yt-dlp`, if `yt-dlp` is installed. That covers:

- no media on the page;
- no Referer the CDN accepts;
- playlist, key or segment downloads failing.

Your options carry over:

| grabvid                 | yt-dlp                                                                           |
| ----------------------- | -------------------------------------------------------------------------------- |
| `-q 720`                | `-S res:720`: the best at or under 720p, else the smallest above it              |
| `-q worst`              | `-f wv*+wa/w`                                                                    |
| `-i`                    | grabvid's own picker, filled from `yt-dlp -J`                                    |
| `-F`                    | `yt-dlp -F`                                                                      |
| `-o <file>` / `-o dir/` | `-o <file>` / `-P dir/`; the default name is `[grabvid] <title> - <quality>.mp4` |
| `-j <n>`                | `-N <n>`                                                                         |
| `-r <url>`, `--ua`      | `--referer`, `--user-agent`, only when you set them                              |

`-n` has no yt-dlp equivalent and is ignored.

It does not fall back on Ctrl+C, when you choose to quit at a prompt, or when a direct download breaks mid-transfer. In that last case the `.part` is resumable, so rerun the command instead. Pass `--no-fallback` to turn the fallback off.

## Development

Run the CLI from source with the `serve` target. It builds the package first, then forwards everything after `--` to `grabvid`:

```bash
pnpm exec nx serve @ab-toolbox/grabvid -- <url> [options]

pnpm exec nx serve @ab-toolbox/grabvid -- https://example.com/watch/123 -F             # list the qualities
pnpm exec nx serve @ab-toolbox/grabvid -- https://example.com/watch/123 -i             # pick one from the menu
pnpm exec nx serve @ab-toolbox/grabvid -- https://example.com/watch/123 -o ~/Downloads/ # save into a folder
```

Downloads land in `projects/libs/grabvid/tmp/` (git-ignored) unless `-o` points elsewhere.

The target is marked `continuous` so nx streams the output live and the interactive picker works. The catch is that nx always exits 0, even when the CLI fails, so read the `[x]` line rather than the exit code.

## License

MIT - see the [LICENSE](../../LICENSE) file for details
