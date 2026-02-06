import { logger } from "@/help";
import { getDelay } from "@/help/mihomo";
import { openUrl } from "@/help/cli.ts";
import { z } from "zod";

export default async function handler() {
  const validate = z.object({
    mihomoUrl: z.string(),
    mihomoToken: z.string(),
    mihomoBoard: z.string(),
  });
  const {
    mihomoUrl: mihomoUrlString,
    mihomoToken,
    mihomoBoard,
  } = validate.parse({
    mihomoUrl: Bun.env.MIHOMO_URL,
    mihomoToken: Bun.env.MIHOMO_TOKEN,
    mihomoBoard: Bun.env.MIHOMO_BOARD,
  });
  const mihomoUrl = new URL(mihomoUrlString);
  const url = new URL(mihomoBoard);
  url.searchParams.set("hostname", mihomoUrl.hostname);
  url.searchParams.set("port", mihomoUrl.port);
  url.searchParams.set("secret", mihomoToken);
  url.hash = "#/proxies";
  logger.info(`Opening ${url}, wait global delay test`);
  await getDelay();
  await openUrl(url);
}
