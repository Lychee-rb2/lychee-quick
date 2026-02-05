const logLevel = Bun.env.LOG_LEVEL || "info";
import pino, { type BaseLogger } from "pino";

export let logger: BaseLogger;
export const createLogger = () => {
  if (logger) return logger;
  // 将 logger 输出重定向到 stderr，避免与 inquirer 的 stdout 冲突
  // 使用 pino-pretty 格式化，通过 destination 选项输出到 stderr（文件描述符 2）
  logger = pino({
    level: logLevel,
    transport: {
      target: "pino-pretty",
      options: {
        destination: 2, // 2 是 stderr 的文件描述符
      },
    },
  });
  return logger;
};
