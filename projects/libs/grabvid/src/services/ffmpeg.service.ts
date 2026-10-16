import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GrabError } from '../errors/grab.error.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { errorMessage, interrupted } from '../utils/error.util.js';

/** TS audio needs the ADTS to ASC bitstream fix to live in an mp4; fMP4 audio must not get it. */
export async function remux(ctx: GrabContext, input: string, output: string, fmp4: boolean): Promise<void> {
  const bitstreamFix = fmp4 ? [] : ['-bsf:a', 'aac_adtstoasc'];
  try {
    await promisify(execFile)(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-i', input, '-c', 'copy', ...bitstreamFix, '-f', 'mp4', output],
      { signal: ctx.signal },
    );
  } catch (err) {
    ctx.signal.throwIfAborted();
    if (err instanceof Error && 'signal' in err && err.signal === 'SIGINT') {
      throw interrupted();
    }
    const stderr = err instanceof Error && 'stderr' in err ? String(err.stderr) : errorMessage(err);
    throw new GrabError(`ffmpeg remux failed:\n${stderr}`);
  }
}
