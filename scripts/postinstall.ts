import buildGlobalEnv from "@/scripts/buildGlobalEnv";
import installZshCompletion from "@/scripts/installZshCompletion";
import installCli from "@/scripts/utils/installCli";

const main = async (metaUrl: string = import.meta.url) => {
	const root = new URL("..", metaUrl).pathname.replace(/\/$/, "");
	await buildGlobalEnv();
	await installCli(root);
	await installZshCompletion();
};

export default main;
