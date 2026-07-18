import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, RateLimitConfig } from "../rate-limit";

const TEST_CONFIG: RateLimitConfig = { maxRequests: 3, windowSeconds: 60 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Use unique keys per test to avoid cross-contamination
  });

  it("allows first request", () => {
    const result = checkRateLimit("test-first-" + Date.now(), TEST_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("counts down remaining", () => {
    const key = "test-count-" + Date.now();
    checkRateLimit(key, TEST_CONFIG);
    const r2 = checkRateLimit(key, TEST_CONFIG);
    expect(r2.remaining).toBe(1);
    const r3 = checkRateLimit(key, TEST_CONFIG);
    expect(r3.remaining).toBe(0);
  });

  it("blocks after limit reached", () => {
    const key = "test-block-" + Date.now();
    checkRateLimit(key, TEST_CONFIG);
    checkRateLimit(key, TEST_CONFIG);
    checkRateLimit(key, TEST_CONFIG);
    const r4 = checkRateLimit(key, TEST_CONFIG);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const key = "test-reset-" + Date.now();
    const shortConfig: RateLimitConfig = { maxRequests: 1, windowSeconds: 0 };
    checkRateLimit(key, shortConfig);
    // Wait 1ms so now > resetAt (resetAt = now + 0ms)
    await new Promise((r) => setTimeout(r, 2));
    const r2 = checkRateLimit(key, shortConfig);
    expect(r2.allowed).toBe(true);
  });

  it("different keys are independent", () => {
    const ts = Date.now();
    const key1 = "test-key1-" + ts;
    const key2 = "test-key2-" + ts;
    checkRateLimit(key1, TEST_CONFIG);
    checkRateLimit(key1, TEST_CONFIG);
    checkRateLimit(key1, TEST_CONFIG);
    // key1 exhausted, but key2 is fresh
    const r = checkRateLimit(key2, TEST_CONFIG);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("returns resetAt timestamp in the future", () => {
    const result = checkRateLimit("test-ts-" + Date.now(), TEST_CONFIG);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });
});
