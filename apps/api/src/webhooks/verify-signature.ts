import { createHmac, timingSafeEqual } from 'node:crypto';

/** Checks GitHub's `X-Hub-Signature-256` header against the raw request body. */
export function verifySignature(key: string, rawBody: Buffer, header: string | undefined): boolean {
  if (!header) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', key).update(rawBody).digest('hex')}`);
  const actual = Buffer.from(header);
  // timingSafeEqual throws on unequal lengths
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
