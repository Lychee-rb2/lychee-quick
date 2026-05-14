import buildGlobalEnv from "@/scripts/buildGlobalEnv";
import installCli from "@/scripts/utils/installCli";
import installZshCompletion from "@/scripts/utils/installZshCompletion";

const main = async (metaUrl: string = import.meta.url) => {
	const root = new URL("..", metaUrl).pathname.replace(/\/$/, "");
	await buildGlobalEnv();
	await installCli(root);
	await installZshCompletion(root);
};

export default main;
