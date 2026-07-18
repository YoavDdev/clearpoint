import { describe, it, expect, vi } from "vitest";
import { sha256Hex, validateDeviceToken } from "../device-auth";

describe("sha256Hex", () => {
  it("returns consistent hash for same input", () => {
    const hash1 = sha256Hex("test-token");
    const hash2 = sha256Hex("test-token");
    expect(hash1).toBe(hash2);
  });

  it("returns 64 char hex string", () => {
    const hash = sha256Hex("anything");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different inputs produce different hashes", () => {
    const h1 = sha256Hex("token-a");
    const h2 = sha256Hex("token-b");
    expect(h1).not.toBe(h2);
  });
});

describe("validateDeviceToken", () => {
  const mockToken = "my-device-token";
  const expectedHash = sha256Hex(mockToken);

  it("returns mini_pc_id for valid token", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { token_hash: expectedHash, mini_pc_id: "pc-123", revoked_at: null },
              error: null,
            }),
          }),
        }),
      }),
    };
    // Second call for update
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { token_hash: expectedHash, mini_pc_id: "pc-123", revoked_at: null },
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const result = await validateDeviceToken(mockSupabase as any, mockToken);
    expect(result).toBe("pc-123");
  });

  it("returns null for revoked token", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { token_hash: expectedHash, mini_pc_id: "pc-123", revoked_at: "2026-01-01" },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await validateDeviceToken(mockSupabase as any, mockToken);
    expect(result).toBeNull();
  });

  it("returns null for non-existent token", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await validateDeviceToken(mockSupabase as any, "unknown-token");
    expect(result).toBeNull();
  });

  it("throws on supabase error", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "DB connection failed" },
            }),
          }),
        }),
      }),
    };

    await expect(validateDeviceToken(mockSupabase as any, mockToken))
      .rejects.toThrow("DB connection failed");
  });
});
