import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { WebhooksController } from './webhooks.controller';

const secret = 'test-secret';
const body = Buffer.from('{"action":"opened"}');
const sign = (b: Buffer) => `sha256=${createHmac('sha256', secret).update(b).digest('hex')}`;
const controller = new WebhooksController(secret);

describe('WebhooksController', () => {
  it('accepts a valid signature with 202', () => {
    expect(() => controller.receive({ rawBody: body }, sign(body))).not.toThrow();
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, WebhooksController.prototype.receive)).toBe(202);
  });

  it('rejects a tampered body', () => {
    const tampered = Buffer.from('{"action":"closed"}');
    expect(() => controller.receive({ rawBody: tampered }, sign(body))).toThrow(UnauthorizedException);
  });

  it('rejects a missing header', () => {
    expect(() => controller.receive({ rawBody: body }, undefined)).toThrow(UnauthorizedException);
  });

  it('rejects a missing raw body', () => {
    expect(() => controller.receive({}, sign(body))).toThrow(UnauthorizedException);
  });
});
