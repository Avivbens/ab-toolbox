import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { buffer, text } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';
import { expectedSize, parseHead } from '../parsers/http-head.parser.js';
import type { CurlHead, CurlRequest, CurlResult } from '../types/curl.types.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { interrupted } from '../utils/error.util.js';

const CONNECT_TIMEOUT_SECONDS = 20;

/**
 * Hosts that block yt-dlp fingerprint Node's HTTP stack too, so every request goes through the system curl.
 * Headers are dumped to an extra pipe (fd 3) so stdout carries only the body, while the status
 * and size are known as soon as each response (every redirect hop included) arrives.
 */
export async function curl(ctx: GrabContext, req: CurlRequest): Promise<CurlResult> {
  ctx.signal.throwIfAborted();
  const child = spawn(
    'curl',
    [
      '-sS',
      '-L',
      '--connect-timeout',
      String(CONNECT_TIMEOUT_SECONDS),
      '-A',
      ctx.ua,
      '-D',
      '/dev/fd/3',
      ...(req.referer ? ['-e', req.referer] : []),
      ...(req.args ?? []),
      req.url,
    ],
    { stdio: ['ignore', 'pipe', 'pipe', 'pipe'], signal: ctx.signal },
  );
  const [, stdout, stderr, headerPipe] = child.stdio;
  if (!(stdout instanceof Readable) || !(stderr instanceof Readable) || !(headerPipe instanceof Readable)) {
    throw new Error('curl was spawned without its stdio pipes');
  }

  let head: CurlHead = { status: 0, headers: new Headers() };
  let rawHeaders = '';
  let parsedBlocks = 0;
  headerPipe.setEncoding('latin1');
  headerPipe.on('data', (chunk: string) => {
    rawHeaders += chunk;
    const blocks = rawHeaders.split(/\r?\n\r?\n/).slice(0, -1);
    for (const block of blocks.slice(parsedBlocks)) {
      head = parseHead(block);
      req.onHeaders?.(head);
    }
    parsedBlocks = blocks.length;
  });

  const { sink, onData } = req;
  const [closeArgs, body, stderrText] = await Promise.all([
    once(child, 'close'),
    sink
      ? pipeline(
          stdout,
          async function* (source: AsyncIterable<Buffer>) {
            for await (const chunk of source) {
              onData?.(chunk.length);
              yield chunk;
            }
          },
          sink,
        ).then(() => Buffer.alloc(0))
      : buffer(stdout),
    text(stderr),
  ]);
  ctx.signal.throwIfAborted();
  const [exitCode, killedBy]: unknown[] = closeArgs;
  if (killedBy === 'SIGINT') {
    throw interrupted();
  }
  return {
    ...head,
    exitCode: typeof exitCode === 'number' ? exitCode : -1,
    stderr: stderrText.trim(),
    body,
  };
}

/** With --fail, curl 7.x bails before dumping a 4xx's headers, so its stderr is the only place the status survives. */
export function failureDetail(res: CurlResult): string {
  return res.stderr || `HTTP ${res.status}, curl exit ${res.exitCode}`;
}

export async function fetchText(
  ctx: GrabContext,
  url: string,
  referer?: string,
): Promise<{ status: number; text: string }> {
  const res = await curl(ctx, { url, referer, args: ['--compressed'] });
  return { status: res.status, text: res.body.toString('utf8') };
}

export async function headInfo(
  ctx: GrabContext,
  url: string,
  referer: string | undefined,
): Promise<{ status: number; total: number | undefined }> {
  const res = await curl(ctx, { url, referer, args: ['-I'] });
  return { status: res.status, total: expectedSize(res.status, res.headers) };
}
