// Mock Bun global for Vitest
if (typeof globalThis.Bun === "undefined") {
  globalThis.Bun = {
    env: process.env,
  } as typeof Bun;
}

// Mock bun module
import { vi, afterEach } from "vitest";

vi.mock("bun", () => ({
  $: {
    // Mock shell command execution
    // In tests, we don't actually execute commands
  },
}));

// Global cleanup after each test to prevent memory leaks
afterEach(() => {
  // Clear all environment variable stubs
  vi.unstubAllEnvs();

  // Clear all timers if any were set
  vi.clearAllTimers();

  // Note: vi.restoreAllMocks() is called by individual test files
  // We don't call it here to avoid interfering with test-specific cleanup
});
