import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
};

describe('parseEnv', () => {
  it('parses valid env and defaults PORT', () => {
    expect(parseEnv(valid)).toEqual({ ...valid, PORT: 3001 });
  });

  it('names the missing variable', () => {
    expect(() => parseEnv({ REDIS_URL: valid.REDIS_URL })).toThrow(/DATABASE_URL/);
  });
});
