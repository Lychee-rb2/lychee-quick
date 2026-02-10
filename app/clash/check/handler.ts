import { logger } from "@/help";
import { findCurrentProxy, getDelay } from "@/help/mihomo";
import { echo } from "@/help/cli.ts";
import { t } from "@/i18n";

export default async function handle() {
  try {
    const proxyChain = await findCurrentProxy();
    const lastProxy = proxyChain.at(-1);
    if (!lastProxy) {
      logger.error(t("app.clash.check.noProxy"));
      return;
    }
    const delay = await getDelay({ proxy: lastProxy.name });
    await echo(`proxy: ${proxyChain.map((p) => p.name).join(" -> ")}`);
    await echo(`delay: ${delay}ms`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(t("app.clash.check.unknownError", { error: String(error) }));
    }
    process.exit(1);
  }
}
