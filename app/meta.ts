import { t } from "@/i18n";
import { CLI_NAME } from "@/help/env";

export const completion = () => t("app.completion");
export const help = () => t("app.help", { cli: CLI_NAME() });
