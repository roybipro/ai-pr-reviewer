import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from './verify-signature';

const key = 'test-key';
const body = Buffer.from('{"action":"opened"}');
const sign = (b: Buffer) => `sha256=${createHmac('sha256', key).update(b).digest('hex')}`;

describe('verifySignature', () => {
  it('accepts a valid signature', () => {
    expect(verifySignature(key, body, sign(body))).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verifySignature(key, Buffer.from('{"action":"closed"}'), sign(body))).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifySignature(key, body, undefined)).toBe(false);
  });

  it('rejects a header of the wrong length', () => {
    expect(verifySignature(key, body, 'sha256=abc')).toBe(false);
  });
});
