import { resolve } from "node:path";
import buildGlobalEnv from "./utils/buildGlobalEnv";
import installCli from "./utils/installCli";
import { installZshCompletion } from "./utils/installZshCompletion";

const root = resolve(import.meta.dir, "..");

await buildGlobalEnv(root);
await installCli(root);
await installZshCompletion(root);
