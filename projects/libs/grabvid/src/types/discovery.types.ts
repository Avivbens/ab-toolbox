export interface Discovery {
  candidates: string[];
  page: string;
  /** The outermost page's title wins: embedded players often carry a generic one. */
  title: string | undefined;
}
