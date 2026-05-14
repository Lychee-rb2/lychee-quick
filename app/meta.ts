import { CLI_NAME } from "@/help/env";
import { t } from "@/i18n";

export const completion = () => t("app.completion");
export const help = () => t("app.help", { cli: CLI_NAME() });
