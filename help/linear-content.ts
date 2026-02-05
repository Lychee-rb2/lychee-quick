import type { GithubAttachmentMeta } from "@/types/linear";

export type Mention = { id: string; label: string };
export type PreviewLink = Pick<
  GithubAttachmentMeta["previewLinks"][number],
  "url"
>;

// Linear document node types
export type TextNode = { type: "text"; text: string };
export type MentionNode = {
  type: "suggestion_userMentions";
  attrs: { id: string; label: string };
};
export type LinkTextNode = {
  type: "text";
  marks: { type: "link"; attrs: { href: string } }[];
  text: string;
};
export type ParagraphNode = {
  type: "paragraph";
  content: (TextNode | MentionNode | LinkTextNode)[];
};
export type HorizontalRuleNode = { type: "horizontal_rule" };
export type ListItemNode = { type: "list_item"; content: ParagraphNode[] };
export type BulletListNode = { type: "bullet_list"; content: ListItemNode[] };
export type LinearDocNode = ParagraphNode | HorizontalRuleNode | BulletListNode;
export type LinearDoc = { type: "doc"; content: LinearDocNode[] };

const buildMention = (mention: Mention): [MentionNode, TextNode] => [
  {
    type: "suggestion_userMentions",
    attrs: { id: mention.id, label: mention.label },
  },
  { type: "text", text: ", " },
];

const buildHello = (
  mentions: Mention[],
): [ParagraphNode, HorizontalRuleNode] => [
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Hello " },
      ...mentions.flatMap(buildMention),
      { type: "text", text: "preview links👇" },
    ],
  },
  { type: "horizontal_rule" },
];

const buildPreviews = (
  previews: PreviewLink[],
  issueIdentifier: string,
): BulletListNode => ({
  type: "bullet_list",
  content: previews.map((preview) => ({
    type: "list_item",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "link", attrs: { href: preview.url } }],
            text: `${issueIdentifier} ${preview.url}`,
          },
        ],
      },
    ],
  })),
});

const buildFooter = (footer: string): [HorizontalRuleNode, ParagraphNode] => [
  { type: "horizontal_rule" },
  { type: "paragraph", content: [{ type: "text", text: footer }] },
];

export interface CommentBody {
  linear: LinearDoc;
  markdown: string[];
}

export const buildCommentBody = (
  issueIdentifier: string,
  mentions: Mention[],
  previews: PreviewLink[],
  footer?: string,
): CommentBody => {
  return {
    linear: {
      type: "doc",
      content: [
        ...buildHello(mentions),
        buildPreviews(previews, issueIdentifier),
        ...(footer ? buildFooter(footer) : []),
      ],
    },
    markdown: [
      `# Hello ${mentions.map((i) => i.label).join(",")}, preview links👇`,
      `---`,
      ...previews.map((i) => `- [${issueIdentifier} ${i.url}](${i.url})`),
      ...(footer ? [`---`, footer] : []),
    ],
  };
};
