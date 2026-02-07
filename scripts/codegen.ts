import { generate } from "@graphql-codegen/cli";
import config from "@/graphql.config.json";

const main = async () => {
  const plugins = [
    "typescript",
    "typescript-operations",
    "typescript-graphql-request",
  ];
  Object.entries(config.projects).forEach(([key, project]) => {
    generate({
      schema: project.schema,
      documents: project.documents,
      generates: {
        [`./graphql/${key}/client.ts`]: { plugins },
      },
    });
  });
};
export default main;
