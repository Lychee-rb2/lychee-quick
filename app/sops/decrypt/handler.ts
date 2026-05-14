import { echo } from "@/help";
import { t } from "@/i18n";
import {
	confirmCoverDecryptedFile,
	pickCoverFolders,
	pickSopsFile,
} from "@/prompts/sops";
import {
	copyEnvToFolders,
	decryptSopsFile,
	getCoverFolders,
	getSopsFiles,
	printCoverResults,
} from "./service";

export default async function handle() {
	const root = process.cwd();
	const files = await getSopsFiles(root);
	const selectedSopsFile = await pickSopsFile(files);
	const output = await decryptSopsFile(selectedSopsFile);
	await echo(t("prompt.sops.decryptSuccess", { file: output }));
	const shouldCover = await confirmCoverDecryptedFile(output);
	if (!shouldCover) return;

	const coverFolders = await getCoverFolders(root);
	const selectedFolders = await pickCoverFolders(coverFolders);
	const results = await copyEnvToFolders(output, selectedFolders);
	await printCoverResults(results);
}
