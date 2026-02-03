import dotenv from "dotenv";
import { resolve } from "node:path";
import { existsSync, unlinkSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";

const root = resolve(import.meta.dir, "..");
const envFile = await Bun.file(resolve(root, ".env")).text();
const envVars = dotenv.parse(envFile);

// Generate global-env.d.ts
const content = `
declare namespace NodeJS {
  export interface ProcessEnv {
    ${Object.keys(envVars)
      .map((key) => `${key}?: string;`)
      .join("\n    ")}
  }
}
`;
await Bun.write(resolve(root, "global-env.d.ts"), content);

// Install CLI with custom name from CLI_NAME env var (default: ly)
const installCli = () => {
  const cliName = envVars.CLI_NAME || "ly";
  const binPath = resolve(root, "bin.ts");
  const bunBinDir = resolve(homedir(), ".bun", "bin");
  const linkPath = resolve(bunBinDir, cliName);

  try {
    // Remove existing symlink if exists
    if (existsSync(linkPath)) {
      unlinkSync(linkPath);
    }
    // Create new symlink
    symlinkSync(binPath, linkPath);
    console.log(`CLI installed: ${cliName} -> ${binPath}`);
  } catch (err) {
    console.error(`Failed to install CLI:`, err);
  }
};

installCli();
