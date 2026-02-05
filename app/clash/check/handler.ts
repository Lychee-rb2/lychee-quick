import { logger } from "@/help";
import { findCurrentProxy, getDelay } from "@/help/mihomo";
import { $ } from "bun";

export default async function handle() {
  try {
    const proxyChain = await findCurrentProxy();
    const lastProxy = proxyChain.at(-1);
    if (!lastProxy) {
      logger.error("No proxy found");
      return;
    }
    const delay = await getDelay({ proxy: lastProxy.name });
    await $`echo "proxy: ${proxyChain.map((p) => p.name).join(" -> ")}"`;
    await $`echo "delay: ${delay}ms"`;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(`未知错误: ${String(error)}`);
    }
    process.exit(1);
  }
}
