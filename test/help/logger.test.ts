import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  vi,
  type MockedFunction,
} from "vitest";

// Mock pino module
const mockLoggerInstance = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
};

const mockPino = vi.fn(() => mockLoggerInstance);

vi.mock("pino", () => ({
  default: mockPino,
}));

describe("logger helper functions", () => {
  let originalLogLevel: string | undefined;
  let loggerModule: typeof import("@/help/logger");

  beforeEach(async () => {
    // Save original LOG_LEVEL
    originalLogLevel = Bun.env.LOG_LEVEL;

    // Clear all mocks
    vi.clearAllMocks();
    mockPino.mockClear();
  });

  afterEach(async () => {
    // Restore original LOG_LEVEL
    if (originalLogLevel !== undefined) {
      Bun.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete Bun.env.LOG_LEVEL;
    }

    // Clear environment variable stubs to prevent memory leaks
    vi.unstubAllEnvs();
  });

  describe("createLogger", () => {
    test("should create logger with default level 'info' when LOG_LEVEL is not set", async () => {
      // Ensure LOG_LEVEL is not set
      delete Bun.env.LOG_LEVEL;

      // Reset modules only when environment variable changes
      vi.resetModules();
      loggerModule = await import("@/help/logger");

      const logger = loggerModule.createLogger();

      expect(logger).toBeDefined();
      expect(mockPino).toHaveBeenCalledTimes(1);
      expect(mockPino).toHaveBeenCalledWith({
        level: "info",
        transport: {
          target: "pino-pretty",
          options: {
            destination: 2,
          },
        },
      });
    });

    test("should create logger with custom LOG_LEVEL from environment variable", async () => {
      // Set custom LOG_LEVEL using stubEnv to properly manage environment variable
      vi.stubEnv("LOG_LEVEL", "debug");

      // Reset modules to read new env var
      vi.resetModules();
      loggerModule = await import("@/help/logger");

      const logger = loggerModule.createLogger();

      expect(logger).toBeDefined();
      expect(mockPino).toHaveBeenCalledTimes(1);
      expect(mockPino).toHaveBeenCalledWith({
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            destination: 2,
          },
        },
      });
    });

    test("should return the same logger instance on multiple calls (singleton pattern)", async () => {
      // Reset modules to ensure fresh logger instance
      vi.resetModules();
      mockPino.mockClear();
      loggerModule = await import("@/help/logger");

      const logger1 = loggerModule.createLogger();
      const logger2 = loggerModule.createLogger();

      expect(logger1).toBe(logger2);
      expect(mockPino).toHaveBeenCalledTimes(1);
    });

    test("should configure transport with pino-pretty and stderr destination", async () => {
      // Reset modules to ensure fresh logger instance
      vi.resetModules();
      mockPino.mockClear();
      loggerModule = await import("@/help/logger");

      loggerModule.createLogger();

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: {
            target: "pino-pretty",
            options: {
              destination: 2,
            },
          },
        }),
      );
    });

    test("should handle different log levels", async () => {
      const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"];

      for (const level of logLevels) {
        // Use stubEnv to properly manage environment variable
        vi.stubEnv("LOG_LEVEL", level);

        // Reset modules to read new env var
        vi.resetModules();
        mockPino.mockClear();
        loggerModule = await import("@/help/logger");

        loggerModule.createLogger();

        expect(mockPino).toHaveBeenCalledWith(
          expect.objectContaining({
            level,
          }),
        );
      }
    });
  });
});
