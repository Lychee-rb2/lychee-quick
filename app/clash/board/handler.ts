import { logger } from "@/help";
import { getDelay } from "@/help/mihomo";
import { openUrl } from "@/help/cli.ts";

export default async function handler() {
  const mihomoUrl = new URL(process.env.MIHOMO_URL);
  const url = new URL(process.env.MIHOMO_BOARD);
  url.searchParams.set("hostname", mihomoUrl.hostname);
  url.searchParams.set("port", mihomoUrl.port);
  url.searchParams.set("secret", process.env.MIHOMO_TOKEN);
  url.hash = "#/proxies";
  logger.info(`Opening ${url}, wait global delay test`);
  await getDelay();
  await openUrl(url);
}
