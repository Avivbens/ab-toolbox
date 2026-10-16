export interface ProgressSnapshot {
  done: number;
  total: number | undefined;
  estimated?: boolean;
  fragment?: { done: number; total: number };
}

export type PartialChoice = 'restart' | 'resume';
