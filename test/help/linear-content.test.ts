import { describe, expect, test } from "vitest";
import {
  buildCommentBody,
  type ParagraphNode,
  type BulletListNode,
  type MentionNode,
} from "@/help/linear-content";

describe("buildCommentBody", () => {
  const issueIdentifier = "LIN-123";
  const mentions = [
    { id: "user-1", label: "Alice" },
    { id: "user-2", label: "Bob" },
  ];
  const previews = [
    { url: "https://preview1.vercel.app" },
    { url: "https://preview2.vercel.app" },
  ];

  test("should generate correct markdown output", () => {
    const result = buildCommentBody(issueIdentifier, mentions, previews);

    expect(result.markdown).toEqual([
      "# Hello Alice,Bob, preview links👇",
      "---",
      `- [${issueIdentifier} https://preview1.vercel.app](https://preview1.vercel.app)`,
      `- [${issueIdentifier} https://preview2.vercel.app](https://preview2.vercel.app)`,
    ]);
  });

  test("should generate correct markdown output with footer", () => {
    const footer = "Please review and provide feedback.";
    const result = buildCommentBody(
      issueIdentifier,
      mentions,
      previews,
      footer,
    );

    expect(result.markdown).toEqual([
      "# Hello Alice,Bob, preview links👇",
      "---",
      `- [${issueIdentifier} https://preview1.vercel.app](https://preview1.vercel.app)`,
      `- [${issueIdentifier} https://preview2.vercel.app](https://preview2.vercel.app)`,
      "---",
      footer,
    ]);
  });

  test("should generate correct linear document structure", () => {
    const result = buildCommentBody(issueIdentifier, mentions, previews);

    expect(result.linear.type).toBe("doc");
    expect(Array.isArray(result.linear.content)).toBe(true);
    expect(result.linear.content.length).toBe(3); // hello paragraph, horizontal_rule, bullet_list
  });

  test("should include mention in linear document", () => {
    const result = buildCommentBody(issueIdentifier, mentions, previews);

    // Check first paragraph contains mentions
    const firstParagraph = result.linear.content[0] as ParagraphNode;
    expect(firstParagraph.type).toBe("paragraph");

    const mentionNode = firstParagraph.content.find(
      (node): node is MentionNode => node.type === "suggestion_userMentions",
    );
    expect(mentionNode).toBeDefined();
    expect(mentionNode!.attrs.id).toBe("user-1");
    expect(mentionNode!.attrs.label).toBe("Alice");
  });

  test("should include horizontal rule in linear document", () => {
    const result = buildCommentBody(issueIdentifier, mentions, previews);

    const horizontalRule = result.linear.content[1];
    expect(horizontalRule.type).toBe("horizontal_rule");
  });

  test("should include bullet list with preview links in linear document", () => {
    const result = buildCommentBody(issueIdentifier, mentions, previews);

    const bulletList = result.linear.content[2] as BulletListNode;
    expect(bulletList.type).toBe("bullet_list");
    expect(bulletList.content.length).toBe(2); // 2 preview links
  });

  test("should handle single mention", () => {
    const singleMention = [{ id: "user-1", label: "Alice" }];
    const result = buildCommentBody(issueIdentifier, singleMention, previews);

    expect(result.markdown[0]).toBe("# Hello Alice, preview links👇");
  });

  test("should handle single preview link", () => {
    const singlePreview = [{ url: "https://preview.vercel.app" }];
    const result = buildCommentBody(issueIdentifier, mentions, singlePreview);

    expect(result.markdown.length).toBe(3);
    expect(result.markdown[2]).toBe(
      `- [${issueIdentifier} https://preview.vercel.app](https://preview.vercel.app)`,
    );
  });

  test("should handle empty mentions", () => {
    const result = buildCommentBody(issueIdentifier, [], previews);

    expect(result.markdown[0]).toBe("# Hello , preview links👇");
  });
});
