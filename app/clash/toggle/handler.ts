import { mihomo } from "@/fetch/mihomo";
import { iconMap, logger } from "@/help";
import { pickProxy } from "@/help/mihomo";
import { MihomoConfig } from "@/types/mihomo";
import { select } from "@inquirer/prompts";

const modes = ["rule", "direct", "global"] as const;
export default async function handle() {
  const config = await mihomo<MihomoConfig>(`configs`);
  const mode = await select({
    message: "To which mode?",
    choices: modes.map((mode) => ({
      name: `${iconMap(`mihomo_${mode}`)}${mode}${
        mode === config.mode ? iconMap("mihomo_active") : ``
      }`,
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
