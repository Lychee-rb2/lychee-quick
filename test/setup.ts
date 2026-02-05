// Mock Bun global for Vitest
if (typeof globalThis.Bun === "undefined") {
  globalThis.Bun = {
    env: process.env,
  } as typeof Bun;
}

// Mock bun module
import { vi } from "vitest";

vi.mock("bun", () => ({
  $: {
    // Mock shell command execution
    // In tests, we don't actually execute commands
  },
}));
