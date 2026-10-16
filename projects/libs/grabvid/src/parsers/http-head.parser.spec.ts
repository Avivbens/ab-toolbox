import { expectedSize, parseHead } from './http-head.parser.js';

describe('parseHead', () => {
  it('reads the status and headers, skipping malformed lines', () => {
    const head = parseHead('HTTP/2 206\r\ncontent-range: bytes 0-99/12345\r\nno colon here\r\n: empty name');
    expect(head.status).toBe(206);
    expect(head.headers.get('content-range')).toBe('bytes 0-99/12345');
  });

  it('reports status 0 for a block without a status line', () => {
    expect(parseHead('garbage').status).toBe(0);
  });
});

describe('expectedSize', () => {
  it('uses the full size from content-range on a 206', () => {
    expect(expectedSize(206, new Headers({ 'content-range': 'bytes 100-199/5000' }))).toBe(5000);
  });

  it('uses content-length on a 200', () => {
    expect(expectedSize(200, new Headers({ 'content-length': '42' }))).toBe(42);
  });

  it('knows nothing for other statuses or missing headers', () => {
    expect(expectedSize(404, new Headers({ 'content-length': '42' }))).toBeUndefined();
    expect(expectedSize(200, new Headers())).toBeUndefined();
  });
});
