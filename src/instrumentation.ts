// Validate env once at boot so the server refuses to start without it (SECURITY.md §6).
// Node-only code lives in its own file so the Edge build never sees it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrExit } = await import("./instrumentation-node");
    await validateEnvOrExit();
  }
}
