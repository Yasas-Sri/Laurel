import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./id";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const timestampOf = (id: string) => parseInt(id.replace(/-/g, "").slice(0, 12), 16);

afterEach(() => {
  vi.useRealTimers();
});

describe("newId", () => {
  it("returns a UUIDv7 with the current time in its first 48 bits", () => {
    const before = Date.now();
    const id = newId();
    const after = Date.now();
    expect(id).toMatch(UUID_V7);
    expect(timestampOf(id)).toBeGreaterThanOrEqual(before);
    expect(timestampOf(id)).toBeLessThanOrEqual(after);
  });

  it("encodes timestamps beyond 32 bits exactly", () => {
    vi.useFakeTimers({ now: new Date("2100-01-01T00:00:00Z") });
    expect(timestampOf(newId())).toBe(Date.parse("2100-01-01T00:00:00Z"));
  });

  it("sorts IDs from later milliseconds after earlier ones", () => {
    vi.useFakeTimers({ now: 1_760_000_000_000 });
    const first = newId();
    vi.advanceTimersByTime(1);
    const second = newId();
    expect(first < second).toBe(true);
  });

  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 10_000 }, newId));
    expect(ids.size).toBe(10_000);
  });
});
