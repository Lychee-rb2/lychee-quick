import { describe, expect, test, vi } from "vitest";
import codegen from "@/scripts/codegen";

const { mockGenerate } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
}));
vi.mock("@graphql-codegen/cli", () => ({
  generate: mockGenerate,
}));
vi.mock("@/graphql.config.json", () => ({
  default: {
    projects: {
      test1: {
        schema: "graphql/test1/schema.graphql",
        documents: "graphql/test1/gql/*.graphql",
      },
      test2: {
        schema: "graphql/test2/schema.graphql",
        documents: "graphql/test2/gql/*.graphql",
      },
    },
  },
}));

describe("codegen", () => {
  test("should generate graphql client", async () => {
    await codegen();
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(mockGenerate).toHaveBeenCalledWith({
      schema: "graphql/test1/schema.graphql",
      documents: "graphql/test1/gql/*.graphql",
      generates: {
        [`./graphql/test1/client.ts`]: {
          plugins: [
            "typescript",
            "typescript-operations",
            "typescript-graphql-request",
          ],
        },
      },
    });
    expect(mockGenerate).toHaveBeenCalledWith({
      schema: "graphql/test2/schema.graphql",
      documents: "graphql/test2/gql/*.graphql",
      generates: {
        [`./graphql/test2/client.ts`]: {
          plugins: [
            "typescript",
            "typescript-operations",
            "typescript-graphql-request",
          ],
        },
      },
    });
  });
});
