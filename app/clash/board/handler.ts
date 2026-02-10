import { logger } from "@/help";
import { getDelay } from "@/help/mihomo";
import { openUrl } from "@/help/cli.ts";
import { MIHOMO_URL, MIHOMO_TOKEN, MIHOMO_BOARD } from "@/help/env";
import { t } from "@/i18n";

export default async function handler() {
  const mihomoUrlString = MIHOMO_URL();
  const mihomoToken = MIHOMO_TOKEN();
  const mihomoBoard = MIHOMO_BOARD();
  const mihomoUrl = new URL(mihomoUrlString);
  const url = new URL(mihomoBoard);
  url.searchParams.set("hostname", mihomoUrl.hostname);
  url.searchParams.set("port", mihomoUrl.port);
  url.searchParams.set("secret", mihomoToken);
  url.hash = "#/proxies";
  logger.info(t("app.clash.board.openWait", { url: String(url) }));
  await getDelay();
  await openUrl(url);
}
