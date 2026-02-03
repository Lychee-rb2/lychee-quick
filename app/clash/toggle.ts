import { mihomo } from "@/fetch/mihomo";
import { logger } from "@/help";
import { pickProxy } from "@/help/mihomo";
import { MihomoConfig } from "@/types/mihomo";
import { select } from "@inquirer/prompts";

export default async function () {
  const config = await mihomo<MihomoConfig>(`configs`);
  const mode = await select({
    message: "To which mode?",
    choices: ["rule", "direct", "global"]
      .sort((a) => (config.mode === a ? 1 : -1))
      .map((mode) => ({
        name: mode === config.mode ? `${mode}(NOW)` : mode,
        value: mode,
      })),
    loop: true,
  });

  await mihomo(`configs`, { body: { mode }, method: "PATCH" });
  const newConfig = await mihomo<MihomoConfig>(`configs`);
  if (newConfig.mode === "rule") {
    await pickProxy({ refresh: true });
  } else {
    logger.info(`Mode changed to ${newConfig.mode}`);
  }
}
