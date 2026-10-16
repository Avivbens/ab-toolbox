import type { Writable } from 'node:stream';

export interface CurlHead {
  status: number;
  headers: Headers;
}

export interface CurlResult extends CurlHead {
  exitCode: number;
  stderr: string;
  body: Buffer;
}

export interface CurlRequest {
  url: string;
  referer?: string | undefined;
  args?: readonly string[];
  /** Streams the body here instead of buffering it into `CurlResult.body`. */
  sink?: Writable;
  onHeaders?: (head: CurlHead) => void;
  onData?: (bytes: number) => void;
}
