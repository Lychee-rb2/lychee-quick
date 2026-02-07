import { describe, expect, test, beforeEach, vi } from "vitest";
import { createLogger, _resetLogger } from "@/help/logger";
import { LOG_LEVEL } from "@/help/env";

// Mock console.log
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

// vi.hoisted ensures these are available when vi.mock factory runs (both are hoisted)
const { mockLoggerInstance, mockPino } = vi.hoisted(() => {
  const mockLoggerInstance = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  };
  const mockPino = vi.fn(() => mockLoggerInstance);
  return { mockLoggerInstance, mockPino };
});

vi.mock("pino", () => ({
  default: mockPino,
}));

vi.mock("@/help/env", () => ({
  LOG_LEVEL: vi.fn().mockReturnValue("info"),
}));

describe("logger helper functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPino.mockClear();
    _resetLogger();
  });

  describe("createLogger", () => {
    test("should create logger with default level 'info' when LOG_LEVEL is not set", () => {
      const logger = createLogger();

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

    test("should create logger with custom LOG_LEVEL from environment variable", () => {
      vi.mocked(LOG_LEVEL).mockReturnValue("debug");

      const logger = createLogger();

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

    test("should return the same logger instance on multiple calls (singleton pattern)", () => {
      const logger1 = createLogger();
      const logger2 = createLogger();

      expect(logger1).toBe(logger2);
      expect(mockPino).toHaveBeenCalledTimes(1);
    });

    test("should configure transport with pino-pretty and stderr destination", () => {
      createLogger();

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

    test("should handle different log levels", () => {
      const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"];

      for (const level of logLevels) {
        vi.mocked(LOG_LEVEL).mockReturnValue(level);
        _resetLogger();
        mockPino.mockClear();

        createLogger();

        expect(mockPino).toHaveBeenCalledWith(
          expect.objectContaining({
            level,
          }),
        );
      }
    });
  });

  describe("plain method", () => {
    test("should output plain text without formatting", () => {
      const logger = createLogger();

      expect(logger.plain).toBeDefined();
      expect(typeof logger.plain).toBe("function");

      logger.plain("test message", 123, { key: "value" });

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith("test message", 123, {
        key: "value",
      });
    });

    test("should not interfere with pino logger methods", () => {
      const logger = createLogger();

      // Test that pino methods still work
      logger.info("info message");
      expect(mockLoggerInstance.info).toHaveBeenCalledWith("info message");

      // Test that plain method works independently
      logger.plain("plain message");
      expect(mockConsoleLog).toHaveBeenCalledWith("plain message");
      expect(mockLoggerInstance.info).toHaveBeenCalledTimes(1); // Should not call info again
    });

    test("should handle multiple arguments", () => {
      const logger = createLogger();

      logger.plain("arg1", "arg2", "arg3");

      expect(mockConsoleLog).toHaveBeenCalledWith("arg1", "arg2", "arg3");
    });

    test("should handle empty arguments", () => {
      const logger = createLogger();

      logger.plain();

      expect(mockConsoleLog).toHaveBeenCalledWith();
    });
  });

  describe("table method", () => {
    test("should output table with correct width", () => {
      const logger = createLogger();

      logger.table([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith("| a | b | c |");
      expect(mockConsoleLog).toHaveBeenCalledWith("| d | e | f |");
    });

    test("should output table with correct width when data is not a string", () => {
      const logger = createLogger();

      logger.table([
        ["hello", "world"],
        ["good", "morning"],
      ]);
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith("| hello | world   |");
      expect(mockConsoleLog).toHaveBeenCalledWith("| good  | morning |");
    });
  });
});
