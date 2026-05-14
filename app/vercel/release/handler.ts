import { addMinutes, subMinutes } from "date-fns";
import { openUrl } from "@/help/cli.ts";
import { VERCEL_TEAM } from "@/help/env";
import { pickProjectForRelease } from "@/prompts/vercel";

export default async function handle() {
	const deployHooks = await pickProjectForRelease();
	await Promise.all(deployHooks.map(({ url }) => fetch(url)));
	const team = VERCEL_TEAM();
	const query = new URLSearchParams();
	const start = subMinutes(new Date(), 10).toISOString();
	const end = addMinutes(new Date(), 10).toISOString();
	query.append("range", JSON.stringify({ start, end }));
	const url = `https://vercel.com/${team}/~/deployments?${query.toString()}`;
	await openUrl(url);
}
