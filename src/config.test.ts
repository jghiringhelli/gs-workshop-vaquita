import { describe, it, expect, beforeEach } from 'vitest';
import { config, validateConfig } from './config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default MAX_PARTICIPANTS', () => {
    delete process.env.MAX_PARTICIPANTS;
    expect(config.MAX_PARTICIPANTS).toBe(20);
  });

  it('should use default PENALTY_PERCENTAGE', () => {
    expect(config.PENALTY_PERCENTAGE).toBeGreaterThanOrEqual(0);
  });

  it('should pass validation with valid config', () => {
    process.env.JWT_SECRET = 'test-secret';
    expect(() => validateConfig()).not.toThrow();
  });

  it('should have MIN_PARTICIPANTS constant', () => {
    expect(config.MIN_PARTICIPANTS).toBe(3);
  });

  it('should have PORT config', () => {
    expect(config.PORT).toBeGreaterThan(0);
  });

  it('should have NODE_ENV config', () => {
    expect(config.NODE_ENV).toBeDefined();
  });
});
