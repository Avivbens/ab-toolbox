/** An expected failure: reported as a one-line `[x] message`, never as a stack trace. */
export class GrabError extends Error {
  override name = 'GrabError';
}
