import { gitShowRef } from "help";

export const findNextBranch = async (
  branch: string,
  version = 1,
): Promise<string> => {
  const cur = version > 1 ? `${branch}-${version}` : branch;
  const output = gitShowRef(`refs/heads/${cur}`);
  if (!output) return cur;
  return findNextBranch(branch, version + 1);
};
