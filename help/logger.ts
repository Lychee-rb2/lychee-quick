import pino, { type BaseLogger } from "pino";
import { LOG_LEVEL } from "@/help/env";

// 扩展 logger 类型，添加 plain 方法
export interface ExtendedLogger extends BaseLogger {
  plain: (...args: unknown[]) => void;
  table: <T extends string[]>(data: T[]) => void;
}

export let logger: ExtendedLogger;
export const createLogger = () => {
  if (logger) return logger;
  const logLevel = LOG_LEVEL();
  // 将 logger 输出重定向到 stderr，避免与 inquirer 的 stdout 冲突
  // 使用 pino-pretty 格式化，通过 destination 选项输出到 stderr（文件描述符 2）
  const pinoLogger = pino({
    level: logLevel,
    transport: {
      target: "pino-pretty",
      options: {
        destination: 2, // 2 是 stderr 的文件描述符
      },
    },
  });

  // 添加 plain 方法：直接输出，不带格式
  logger = Object.assign(pinoLogger, {
    plain: (...args: unknown[]) => {
      console.log(...args);
    },
    table: <T extends string[]>(data: T[]) => {
      const width: Record<string, number> = {};
      data.forEach((item) => {
        item.forEach((value, index) => {
          width[index] = Math.max(width[index] || 0, value.toString().length);
        });
      });
      data.forEach((item) => {
        console.log(
          "| " +
            item
              .map((value, index) => value.toString().padEnd(width[index]))
              .join(" | ") +
            " |",
        );
      });
    },
  }) as ExtendedLogger;

  return logger;
};

/** @internal 仅用于测试重置单例状态 */
export const _resetLogger = () => {
  logger = undefined as unknown as ExtendedLogger;
};
