import { cli } from "help";

export const findNextBranch = async (
  branch: string,
  version = 1,
): Promise<string> => {
  const cur = version > 1 ? `${branch}-${version}` : branch;
  const proc = cli(["git", "show-ref", `refs/heads/${cur}`]);
  const output = await new Response(proc.stdout.toString()).text();
  return output.trim() ? findNextBranch(branch, version + 1) : cur;
};
