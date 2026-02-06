import { mihomo } from "@/fetch/mihomo";
import { logger } from "@/help";
import { pickProxy } from "@/help/mihomo";
import { pickMode } from "@/prompts/mihomo";
import { MihomoConfig } from "@/types/mihomo";

export default async function handle() {
  const mode = await pickMode();
  await mihomo(`configs`, { body: { mode }, method: "PATCH" });
  const newConfig = await mihomo<MihomoConfig>(`configs`);
  if (newConfig.mode === "rule") {
    await pickProxy({ refresh: true });
  } else {
    logger.info(`Mode changed to ${newConfig.mode}`);
  }
}
