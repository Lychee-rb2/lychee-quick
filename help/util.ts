import { logger } from "./logger";

export const pbcopy = async (data: string) => {
  await navigator.clipboard.writeText(data);
  logger.info(`\n`);
};
