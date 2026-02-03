import { mihomo } from "@/fetch/mihomo";
import { logger } from "@/help";
import { findCurrentProxy } from "@/help/mihomo";
import { $ } from "bun";

export default async function handle() {
  const proxyChain = await findCurrentProxy();
  const lastProxy = proxyChain.at(-1);
  if (!lastProxy) {
    logger.error("No proxy found");
    return;
  }
  const qs = new URLSearchParams({
    url: "https://www.gstatic.com/generate_204",
    timeout: "5000",
  });
  const delay = await mihomo<{ delay: number }>(
    `proxies/${encodeURIComponent(lastProxy.name)}/delay?${qs.toString()}`,
  ).then((result) => result.delay);
  await $`echo "proxy: ${proxyChain.map((p) => p.name).join(" -> ")}"`;
  await $`echo "delay: ${delay}ms"`;
}
