import "server-only";
import { z } from "zod";

// Spec: .env.example (one entry per variable) and ARCHITECTURE.md §9 (editions, adapters).

const optional = z.string().optional();
const secret = z.string().min(32);
const flag = z.stringbool().default(false);
const httpUrl = z
  .url({ protocol: /^https?$/ })
  .refine((url) => !url.endsWith("/"), "must not end with a slash");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    APP_URL: httpUrl,
    HOSTED_MODE: flag,
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url().optional(),
    TEST_DATABASE_URL: z.url().optional(),

    BETTER_AUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,

    IP_HASH_SECRET: secret,
    CRON_SECRET: secret.optional(),
    TURNSTILE_SITE_KEY: optional,
    TURNSTILE_SECRET_KEY: optional,

    S3_ENDPOINT: httpUrl,
    S3_REGION: z.string(),
    S3_BUCKET_PRIVATE: z.string(),
    S3_BUCKET_PUBLIC: z.string(),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    S3_FORCE_PATH_STYLE: flag,
    MEDIA_PUBLIC_URL: httpUrl,

    EMAIL_PROVIDER: z.enum(["smtp", "console"]).optional(),
    EMAIL_FROM: optional,
    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    SMTP_SECURE: flag,

    QSTASH_TOKEN: optional,
    QSTASH_CURRENT_SIGNING_KEY: optional,
    QSTASH_NEXT_SIGNING_KEY: optional,
    QSTASH_URL: httpUrl.optional(),

    UPSTASH_REDIS_REST_URL: httpUrl.optional(),
    UPSTASH_REDIS_REST_TOKEN: optional,

    AI_BASE_URL: httpUrl.default("https://api.openai.com/v1"),
    AI_API_KEY: optional,
    AI_TRANSCRIBE_MODEL: z.string().default("whisper-1"),
    AI_CHAT_MODEL: optional,

    BILLING_ENABLED: flag,
    LEMONSQUEEZY_API_KEY: optional,
    LEMONSQUEEZY_STORE_ID: optional,
    LEMONSQUEEZY_WEBHOOK_SECRET: optional,
    LEMONSQUEEZY_VARIANT_PRO_MONTHLY: optional,
    LEMONSQUEEZY_VARIANT_PRO_YEARLY: optional,
    LEMONSQUEEZY_VARIANT_TEAM_MONTHLY: optional,
    LEMONSQUEEZY_VARIANT_TEAM_YEARLY: optional,

    SENTRY_DSN: z.url().optional(),
    TELEMETRY_ENABLED: flag,
  })
  .superRefine((env, ctx) => {
    const require = (keys: (keyof typeof env)[], why: string) => {
      for (const key of keys) {
        if (env[key] === undefined) ctx.addIssue({ code: "custom", path: [key], message: why });
      }
    };
    const allOrNone = (keys: (keyof typeof env)[]) => {
      if (keys.some((key) => env[key] !== undefined))
        require(keys, `set all of ${keys.join(", ")}`);
    };

    allOrNone(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
    allOrNone(["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"]);
    allOrNone(["QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"]);
    allOrNone(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]);

    if (env.EMAIL_PROVIDER === "smtp") {
      require(["SMTP_HOST", "SMTP_PORT", "EMAIL_FROM"], "required when EMAIL_PROVIDER=smtp");
    }

    if (env.BILLING_ENABLED) {
      if (!env.HOSTED_MODE) {
        ctx.addIssue({
          code: "custom",
          path: ["BILLING_ENABLED"],
          message: "requires HOSTED_MODE=true",
        });
      }
      require([
        "LEMONSQUEEZY_API_KEY",
        "LEMONSQUEEZY_STORE_ID",
        "LEMONSQUEEZY_WEBHOOK_SECRET",
        "LEMONSQUEEZY_VARIANT_PRO_MONTHLY",
        "LEMONSQUEEZY_VARIANT_PRO_YEARLY",
        "LEMONSQUEEZY_VARIANT_TEAM_MONTHLY",
        "LEMONSQUEEZY_VARIANT_TEAM_YEARLY",
      ], "required when BILLING_ENABLED=true");
    }

    if (env.NODE_ENV === "production") {
      require(["CRON_SECRET"], "required in production");
      // Console email would write sign-in tokens to the logs.
      if (env.EMAIL_PROVIDER === "console") {
        ctx.addIssue({ code: "custom", path: ["EMAIL_PROVIDER"], message: "console is dev-only" });
      }
      // Spec: AGENTS.md rule 8 — production needs at least one sign-in method.
      if (env.EMAIL_PROVIDER !== "smtp" && env.GOOGLE_CLIENT_ID === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_PROVIDER"],
          message: "production needs EMAIL_PROVIDER=smtp or Google sign-in",
        });
      }
      // Spec: SECURITY.md C4 — user uploads never share the app's origin.
      if (new URL(env.MEDIA_PUBLIC_URL).origin === new URL(env.APP_URL).origin) {
        ctx.addIssue({
          code: "custom",
          path: ["MEDIA_PUBLIC_URL"],
          message: "must be a different origin from APP_URL",
        });
      }
    }
  })
  .transform((env) => ({
    ...env,
    DATABASE_URL_UNPOOLED: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL,
    // Unset outside production means console; unset in production means email is off.
    EMAIL_PROVIDER: env.EMAIL_PROVIDER ?? (env.NODE_ENV === "production" ? undefined : "console"),
  }));

export type Env = z.output<typeof schema>;

/** Parses env vars; throws listing the offending names (never their values). */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // .env.example leaves optional values empty; treat empty as unset.
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
  const result = schema.safeParse(present);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables:\n  ${problems.join("\n  ")}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
