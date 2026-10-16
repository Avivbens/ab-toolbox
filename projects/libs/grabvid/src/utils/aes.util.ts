import { createDecipheriv } from 'node:crypto';

/** Per the HLS spec, a key without an IV uses the segment's media sequence number. */
export function sequenceIv(seq: number): Buffer {
  const iv = Buffer.alloc(16);
  iv.writeBigUInt64BE(BigInt(seq), 8);
  return iv;
}

export function decryptAes128(data: Buffer, key: Buffer, iv: Buffer): Buffer {
  const decipher = createDecipheriv('aes-128-cbc', key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
