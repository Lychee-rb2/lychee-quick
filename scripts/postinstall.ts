import buildGlobalEnv from "@/scripts/utils/buildGlobalEnv";
import installCli from "@/scripts/utils/installCli";
import installZshCompletion from "@/scripts/utils/installZshCompletion";

const main = async (metaUrl: string = import.meta.url) => {
  const root = new URL("..", metaUrl).pathname.replace(/\/$/, "");
  await buildGlobalEnv(root);
  await installCli(root);
  await installZshCompletion(root);
};

export default main;
