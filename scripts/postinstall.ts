import { resolve } from "node:path";
import { buildGlobalEnv } from "./buildGlobalEnv";
import { installCli } from "./installCli";
import { installZshCompletion } from "./installZshCompletion";
const root = resolve(import.meta.dir, "..");

await buildGlobalEnv(root);
await installCli(root);
await installZshCompletion(root);
