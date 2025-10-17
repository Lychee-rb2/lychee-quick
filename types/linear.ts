import type { IssuesQuery } from "@/graphql/linear/client";

export interface GithubAttachmentMeta {
  id: string;
  url: string;
  draft: boolean;
  title: string;
  branch: string;
  number: number;
  repoId: string;
  status: "open" | "merged" | "closed" | "draft";
  userId: string;
  reviews: {
    id: number;
    state:
      | "approved"
      | "changes_requested"
      | "commented"
      | "dismissed"
      | "pending";
    reviewerId: number;
    submittedAt: string;
    reviewerLogin: string;
    reviewerAvatarUrl: string;
  }[];
  closedAt: null;
  linkKind: "closes";
  mergedAt: null;
  repoName: string;
  createdAt: string;
  repoLogin: string;
  reviewers: [];
  updatedAt: string;
  userLogin: string;
  previewLinks: {
    url: string;
    name: string;
    origin: {
      id: number;
      type: string;
    };
  }[];
  targetBranch: string;
}
export type IssuesQueryItem = IssuesQuery["issues"]["nodes"][number];
export type Issue = Omit<IssuesQueryItem, "attachments"> & {
  attachments: {
    nodes: Attachment[];
  };
};
export type Attachment = Omit<
  IssuesQueryItem["attachments"]["nodes"][number],
  "metadata"
> & {
  metadata: GithubAttachmentMeta;
};
