export const logger = {
  step: (message: string): void => console.log(`[*] ${message}`),
  found: (message: string): void => console.log(`[+] ${message}`),
  info: (message: string): void => console.log(`[info] ${message}`),
  download: (message: string): void => console.log(`[download] ${message}`),
  done: (message: string): void => console.log(`[✓] ${message}`),
  warn: (message: string): void => console.error(`[!] ${message}`),
  error: (message: string): void => console.error(`[x] ${message}`),
};
