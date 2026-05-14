import installZshCompletion from "@/scripts/utils/installZshCompletion";

export const resolveRoot = (metaUrl: string) =>
	new URL("..", metaUrl).pathname.replace(/\/$/, "");

const main = async (metaUrl: string = import.meta.url) => {
	return installZshCompletion(resolveRoot(metaUrl));
};

export default main;

if (import.meta.main) {
	await main();
}
