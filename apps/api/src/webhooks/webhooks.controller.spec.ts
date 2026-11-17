import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import created from '../installations/fixtures/installation.created.json';
import { WebhooksController } from './webhooks.controller';

const secret = 'test-secret';
const body = Buffer.from('{"action":"opened"}');
const sign = (b: Buffer) => `sha256=${createHmac('sha256', secret).update(b).digest('hex')}`;

function setup(rowCount = 1) {
  const query = vi.fn().mockResolvedValue({ rowCount });
  const add = vi.fn().mockResolvedValue({});
  return { query, add, controller: new WebhooksController(secret, { query } as never, { add } as never) };
}

describe('WebhooksController', () => {
  it('accepts a valid signature with 202, records and enqueues the delivery', async () => {
    const { query, add, controller } = setup();
    await expect(controller.receive({ rawBody: body }, sign(body), 'd-1', 'ping')).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT DO NOTHING'), ['d-1', 'ping']);
    expect(add).toHaveBeenCalledWith('ping', { deliveryId: 'd-1', event: 'ping', payload: body.toString() }, { jobId: 'd-1' });
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, WebhooksController.prototype.receive)).toBe(202);
  });

  it('still returns 202 for a duplicate delivery but does not enqueue it', async () => {
    const { add, controller } = setup(0);
    await expect(controller.receive({ rawBody: body }, sign(body), 'd-1', 'ping')).resolves.toBeUndefined();
    expect(add).not.toHaveBeenCalled();
  });

  it('rejects a tampered body without touching the db or queue', async () => {
    const { query, add, controller } = setup();
    const tampered = Buffer.from('{"action":"closed"}');
    await expect(controller.receive({ rawBody: tampered }, sign(body), 'd-1', 'ping')).rejects.toThrow(UnauthorizedException);
    expect(query).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it('rejects a missing signature header', async () => {
    const { controller } = setup();
    await expect(controller.receive({ rawBody: body }, undefined, 'd-1', 'ping')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a missing raw body', async () => {
    const { controller } = setup();
    await expect(controller.receive({}, sign(body), 'd-1', 'ping')).rejects.toThrow(UnauthorizedException);
  });

  it('applies installation events before recording the delivery', async () => {
    const { query, add, controller } = setup();
    const payload = Buffer.from(JSON.stringify(created));
    await controller.receive({ rawBody: payload }, sign(payload), 'd-2', 'installation');
    expect(query.mock.calls[0][0]).toContain('INSERT INTO installations');
    expect(query.mock.calls[1][0]).toContain('webhook_deliveries');
    expect(add).toHaveBeenCalledOnce();
  });

  it('rejects a malformed installation payload with 400 and records nothing', async () => {
    const { query, controller } = setup();
    const payload = Buffer.from('{"action":"created"}');
    await expect(controller.receive({ rawBody: payload }, sign(payload), 'd-3', 'installation')).rejects.toThrow(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects missing delivery headers with 400', async () => {
    const { controller } = setup();
    await expect(controller.receive({ rawBody: body }, sign(body), undefined, 'ping')).rejects.toThrow(BadRequestException);
  });

  it('logs only the event name and delivery id, never the secret, signature or body', async () => {
    const out: string[] = [];
    const capture = (chunk: unknown) => (out.push(String(chunk)), true);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(capture);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(capture);
    try {
      const { controller } = setup();
      const payload = Buffer.from(JSON.stringify({ action: 'opened', leaked: secret }));
      const signature = sign(payload);
      await controller.receive({ rawBody: payload }, signature, 'd-9', 'pull_request');
      const logged = out.join('');
      expect(logged).toContain('pull_request');
      expect(logged).toContain('d-9');
      expect(logged).not.toContain(secret);
      expect(logged).not.toContain(signature.slice(7));
      expect(logged).not.toContain('opened');
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});
