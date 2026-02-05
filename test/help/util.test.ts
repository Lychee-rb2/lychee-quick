import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { pbcopy } from "@/help/util";

// Mock modules (must be called before imports)
vi.mock("@/help/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked modules
import { logger } from "@/help/logger";

// Type definitions for mocks
type MockedLogger = {
  info: MockedFunction<typeof logger.info>;
  error: MockedFunction<typeof logger.error>;
  debug: MockedFunction<typeof logger.debug>;
};

// Helper function to safely cast logger to MockedLogger
const getMockedLogger = (): MockedLogger => {
  return logger as unknown as MockedLogger;
};

describe("util helper functions", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("pbcopy", () => {
    test("should copy data to clipboard using navigator.clipboard", async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      const mockClipboard = {
        writeText: mockWriteText,
      };

      // Mock navigator.clipboard
      Object.defineProperty(globalThis, "navigator", {
        value: { clipboard: mockClipboard },
        writable: true,
        configurable: true,
      });

      await pbcopy("test data");

      expect(mockWriteText).toHaveBeenCalledWith("test data");
      expect(getMockedLogger().info).toHaveBeenCalledWith("\n");
    });
  });
});
