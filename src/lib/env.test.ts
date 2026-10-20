import { readFileSync } from "node:fs";
import { parseEnv as parseDotenv } from "node:util";
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

// The documented example config, with the two required secrets filled in.
const example = {
  ...parseDotenv(readFileSync(new URL("../../.env.example", import.meta.url), "utf8")),
  BETTER_AUTH_SECRET: "a".repeat(32),
  IP_HASH_SECRET: "b".repeat(32),
  NODE_ENV: "development",
};

const production = {
  ...example,
  NODE_ENV: "production",
  APP_URL: "https://app.example.com",
  MEDIA_PUBLIC_URL: "https://media.example.com",
  CRON_SECRET: "c".repeat(32),
};

describe("parseEnv", () => {
  it("accepts .env.example once the required secrets are set", () => {
    const env = parseEnv(example);
    expect(env.S3_BUCKET_PRIVATE).toBe("laurel-private");
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.HOSTED_MODE).toBe(false);
    expect(env.DATABASE_URL_UNPOOLED).toBe(env.DATABASE_URL);
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
  });

  it("rejects missing or short secrets without echoing their values", () => {
    expect(() => parseEnv({ ...example, BETTER_AUTH_SECRET: "" })).toThrow(/BETTER_AUTH_SECRET/);
    const attempt = () => parseEnv({ ...example, IP_HASH_SECRET: "too-short-value" });
    expect(attempt).toThrow(/IP_HASH_SECRET/);
    expect(attempt).not.toThrow(/too-short-value/);
  });

  it("rejects a half-configured optional adapter", () => {
    expect(() => parseEnv({ ...example, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_SECRET/);
    expect(() => parseEnv({ ...example, UPSTASH_REDIS_REST_TOKEN: "t" })).toThrow(
      /UPSTASH_REDIS_REST_URL/,
    );
  });

  it("requires SMTP settings when EMAIL_PROVIDER=smtp", () => {
    expect(() => parseEnv({ ...example, SMTP_HOST: "" })).toThrow(/SMTP_HOST/);
  });

  it("defaults email to console outside production", () => {
    expect(parseEnv({ ...example, EMAIL_PROVIDER: "" }).EMAIL_PROVIDER).toBe("console");
  });

  it("only allows billing on the hosted edition", () => {
    const keys = {
      LEMONSQUEEZY_API_KEY: "k",
      LEMONSQUEEZY_STORE_ID: "1",
      LEMONSQUEEZY_WEBHOOK_SECRET: "s",
      LEMONSQUEEZY_VARIANT_PRO_MONTHLY: "1",
      LEMONSQUEEZY_VARIANT_PRO_YEARLY: "2",
      LEMONSQUEEZY_VARIANT_TEAM_MONTHLY: "3",
      LEMONSQUEEZY_VARIANT_TEAM_YEARLY: "4",
    };
    expect(() => parseEnv({ ...example, ...keys, BILLING_ENABLED: "true" })).toThrow(/HOSTED_MODE/);
    expect(() => parseEnv({ ...example, HOSTED_MODE: "true", BILLING_ENABLED: "true" })).toThrow(
      /LEMONSQUEEZY_API_KEY/,
    );
    expect(
      parseEnv({ ...example, ...keys, HOSTED_MODE: "true", BILLING_ENABLED: "true" })
        .BILLING_ENABLED,
    ).toBe(true);
  });

  it("rejects URLs with a trailing slash", () => {
    expect(() => parseEnv({ ...example, APP_URL: "http://localhost:3000/" })).toThrow(/APP_URL/);
  });

  describe("in production", () => {
    it("accepts a complete config", () => {
      expect(parseEnv(production).NODE_ENV).toBe("production");
    });

    it("requires CRON_SECRET", () => {
      expect(() => parseEnv({ ...production, CRON_SECRET: "" })).toThrow(/CRON_SECRET/);
    });

    it("rejects console email", () => {
      expect(() => parseEnv({ ...production, EMAIL_PROVIDER: "console" })).toThrow(/dev-only/);
    });

    it("needs SMTP or Google to sign in", () => {
      const noEmail = { ...production, EMAIL_PROVIDER: "" };
      expect(() => parseEnv(noEmail)).toThrow(/sign-in/);
      const googleOnly = parseEnv({
        ...noEmail,
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "s",
      });
      expect(googleOnly.EMAIL_PROVIDER).toBeUndefined();
    });

    it("keeps media on a separate origin", () => {
      expect(() =>
        parseEnv({ ...production, MEDIA_PUBLIC_URL: "https://app.example.com/media" }),
      ).toThrow(/MEDIA_PUBLIC_URL/);
    });
  });
});
