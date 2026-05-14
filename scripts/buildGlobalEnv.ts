import buildGlobalEnv from "@/scripts/utils/buildGlobalEnv";

export const resolveRoot = (metaUrl: string) =>
	new URL("..", metaUrl).pathname.replace(/\/$/, "");

const main = async (metaUrl: string = import.meta.url) => {
	return buildGlobalEnv(resolveRoot(metaUrl));
};

export default main;

if (import.meta.main) {
	await main();
}
