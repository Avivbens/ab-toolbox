export function interrupted(): DOMException {
  return new DOMException('interrupted', 'AbortError');
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
