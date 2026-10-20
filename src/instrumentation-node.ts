export async function validateEnvOrExit(): Promise<void> {
  try {
    await import("@/lib/env");
  } catch (error) {
    // Next only logs a failing instrumentation hook and keeps serving; a misconfigured server must not.
    // lib/logger needs a valid env, so this is the one boot-time console write.
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
