import pino, { type BaseLogger } from "pino";

// 扩展 logger 类型，添加 plain 方法
export interface ExtendedLogger extends BaseLogger {
  plain: (...args: unknown[]) => void;
}

export let logger: ExtendedLogger;
export const createLogger = () => {
  if (logger) return logger;
  const logLevel = Bun.env.LOG_LEVEL || "info";
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
  }) as ExtendedLogger;

  return logger;
};

/** @internal 仅用于测试重置单例状态 */
export const _resetLogger = () => {
  logger = undefined as unknown as ExtendedLogger;
};
