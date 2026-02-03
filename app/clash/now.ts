import { mihomo } from "@/fetch/mihomo";
import { logger } from "@/help";
import { findCurrentProxy, pickProxy } from "@/help/mihomo";
import { MihomoConfig } from "@/types/mihomo";
import { confirm } from "@inquirer/prompts";

export const completion = "当前代理状态";
export default async function handle() {
  const config = await mihomo<MihomoConfig>(`configs`);
  if (config.mode !== "rule") {
    const answer = await confirm({
      message: "Not in rule mode, switch to rule mode?",
    });
    if (answer) {
      await mihomo(`configs`, { body: { mode: "rule" }, method: "PATCH" });
      await pickProxy({ refresh: true });
    }
    return;
  }
  const proxyChain = await findCurrentProxy();
  const lastProxy = proxyChain.at(-1);
  if (!lastProxy) {
    logger.error("No proxy found");
    return;
  }
  if (!lastProxy.alive) {
    await pickProxy({ refresh: true });
    return;
  }
  const delay = lastProxy?.history?.at(-1)?.delay;

  const answer = await confirm({
    message: `${proxyChain.map((p) => p.name).join(" -> ")}, delay: ${delay}ms. Switch to another proxy?`,
  });
  if (answer) {
    await pickProxy({ refresh: true });
  }
}
