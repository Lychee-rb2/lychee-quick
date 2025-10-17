import { createClient } from "@/fetch/github.ts";

export default async function () {
  await createClient()
    .pullRequest({
      owner: Bun.env.GIT_ORGANIZATION,
      name: Bun.env.GIT_REPO,
    })
    .then((res) => console.log(res.repository.pullRequests.nodes));
}
