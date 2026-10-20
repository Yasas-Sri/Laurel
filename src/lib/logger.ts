import "server-only";
import { env } from "@/lib/env";

type Level = "debug" | "info" | "warn" | "error";
type Fields = { event: string } & Record<string, unknown>;

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Spec: SECURITY.md §5 — logs never contain emails, IPs, tokens, keys or credentials.
const SENSITIVE =
  /^(ip|key)$|(ipaddress|email|token|secret|password|apikey|authorization|cookie)$/i;
const CAMEL_CASE_IP = /[a-z]I[pP]$/; // clientIp, remoteIP — but not "zip"

function isSensitive(field: string): boolean {
  return SENSITIVE.test(field) || CAMEL_CASE_IP.test(field);
}

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  return Object.fromEntries(
    Object.entries(value).map(([field, item]) => [
      field,
      isSensitive(field) ? "[redacted]" : redact(item, seen),
    ]),
  );
}

function write(level: Level, fields: Fields): void {
  if (RANK[level] < RANK[env.LOG_LEVEL]) return;
  const record = redact(fields, new WeakSet()) as Record<string, unknown>;
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...record });
  // The one place allowed to write to the console: one JSON line per call.
  // eslint-disable-next-line no-console
  (level === "warn" || level === "error" ? console.error : console.log)(line);
}

export const logger = {
  debug: (fields: Fields) => write("debug", fields),
  info: (fields: Fields) => write("info", fields),
  warn: (fields: Fields) => write("warn", fields),
  error: (fields: Fields) => write("error", fields),
};
