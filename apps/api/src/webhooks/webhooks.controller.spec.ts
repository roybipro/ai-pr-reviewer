import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { WebhooksController } from './webhooks.controller';

const secret = 'test-secret';
const body = Buffer.from('{"action":"opened"}');
const sign = (b: Buffer) => `sha256=${createHmac('sha256', secret).update(b).digest('hex')}`;

function setup(rowCount = 1) {
  const query = vi.fn().mockResolvedValue({ rowCount });
  return { query, controller: new WebhooksController(secret, { query } as never) };
}

describe('WebhooksController', () => {
  it('accepts a valid signature with 202 and records the delivery', async () => {
    const { query, controller } = setup();
    await expect(controller.receive({ rawBody: body }, sign(body), 'd-1', 'ping')).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT DO NOTHING'), ['d-1', 'ping']);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, WebhooksController.prototype.receive)).toBe(202);
  });

  it('still returns 202 for a duplicate delivery', async () => {
    const { controller } = setup(0);
    await expect(controller.receive({ rawBody: body }, sign(body), 'd-1', 'ping')).resolves.toBeUndefined();
  });

  it('rejects a tampered body without touching the db', async () => {
    const { query, controller } = setup();
    const tampered = Buffer.from('{"action":"closed"}');
    await expect(controller.receive({ rawBody: tampered }, sign(body), 'd-1', 'ping')).rejects.toThrow(UnauthorizedException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a missing signature header', async () => {
    const { controller } = setup();
    await expect(controller.receive({ rawBody: body }, undefined, 'd-1', 'ping')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a missing raw body', async () => {
    const { controller } = setup();
    await expect(controller.receive({}, sign(body), 'd-1', 'ping')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects missing delivery headers with 400', async () => {
    const { controller } = setup();
    await expect(controller.receive({ rawBody: body }, sign(body), undefined, 'ping')).rejects.toThrow(BadRequestException);
  });
});
