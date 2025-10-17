import type { PullRequestQuery } from "@/graphql/github/client";

export type PullRequest =
  PullRequestQuery["repository"]["pullRequests"]["nodes"][number];
