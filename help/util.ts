import { logger } from "./logger";

export const pbcopy = async (data: string) => {
  await navigator.clipboard.writeText(data);
  logger.info(`\n`);
};

export type FalseType = "" | 0 | false | null | undefined;

export const typedBoolean = <Value>(
  value: Value,
): value is Exclude<Value, FalseType> => Boolean(value);
