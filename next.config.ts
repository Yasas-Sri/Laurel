import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep AGENTS.md ours: otherwise `next dev` appends a managed block when it detects an AI agent.
  agentRules: false,
};

export default nextConfig;
