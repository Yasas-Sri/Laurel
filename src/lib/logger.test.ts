import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

const capture = (stream: "log" | "error") =>
  vi.spyOn(console, stream).mockImplementation(() => undefined);

const lines = (spy: ReturnType<typeof capture>) =>
  spy.mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("writes one JSON line with level, time and fields", () => {
    const out = capture("log");
    logger.info({ event: "form.viewed", formId: "f1" });
    expect(lines(out)).toEqual([
      { level: "info", time: expect.any(String), event: "form.viewed", formId: "f1" },
    ]);
  });

  it("redacts PII and credentials at any depth", () => {
    const out = capture("log");
    logger.info({
      event: "submission.received",
      email: "maya@example.com",
      author: { authorEmail: "maya@example.com", name: "Example Person" },
      request: {
        ip: "203.0.113.7",
        clientIp: "203.0.113.7",
        headers: { Authorization: "Bearer x" },
      },
      apiKey: "lrl_live_secret",
      key: "k",
      accessToken: "t",
      items: [{ password: "p" }],
      zip: "10115",
      keyset: "kept",
    });
    const [line] = lines(out);
    expect(line).toMatchObject({
      email: "[redacted]",
      author: { authorEmail: "[redacted]", name: "Example Person" },
      request: {
        ip: "[redacted]",
        clientIp: "[redacted]",
        headers: { Authorization: "[redacted]" },
      },
      apiKey: "[redacted]",
      key: "[redacted]",
      accessToken: "[redacted]",
      items: [{ password: "[redacted]" }],
      zip: "10115",
      keyset: "kept",
    });
    expect(JSON.stringify(line)).not.toMatch(/maya@|203\.0\.113|lrl_live/);
  });

  it("drops levels below LOG_LEVEL (info in .env.example)", () => {
    const out = capture("log");
    logger.debug({ event: "noise" });
    expect(out).not.toHaveBeenCalled();
  });

  it("sends warnings and errors to stderr and serialises Error objects", () => {
    const err = capture("error");
    logger.error({ event: "job.failed", error: new Error("boom") });
    const [line] = lines(err);
    expect(line).toMatchObject({ level: "error", error: { name: "Error", message: "boom" } });
  });

  it("survives circular references", () => {
    const out = capture("log");
    const loop: Record<string, unknown> = { name: "loop" };
    loop.self = loop;
    logger.info({ event: "circular", loop });
    expect(lines(out)[0]).toMatchObject({ loop: { name: "loop", self: "[Circular]" } });
  });
});
