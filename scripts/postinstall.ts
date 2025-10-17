import dotenv from "dotenv";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const path = (p: string) => resolve(root, p);
const env = await Bun.file("./.env").text();
const content = `
declare namespace NodeJS {
  export interface ProcessEnv {
    ${Object.keys(dotenv.parse(env))
      .map((key) => `${key}?: string;`)
      .join("\n    ")}
  }
}
`;

await Bun.write("./global-env.d.ts", content);
const installForZsh = async () => {
  if (!Bun.env.ZSH_RC) {
    console.log(
      "You can add ZSH_RC into your env and run `postinstall` again to use alias",
    );
    return;
  }
  if (!Bun.env.CLI_NAME) {
    console.log(
      "You can add CLI_NAME into your env and run `postinstall` again to use alias",
    );
    return;
  }
  const BIN_PATH = `./bin/bun-help`;
  await Bun.write(
    BIN_PATH,
    `#!/bin/sh
exec bun "${path("./bin.ts")}" "$@"
`,
  );
  const zshrc = await Bun.file(`${Bun.env.ZSH_RC}`).text();
  const zshrcContent = zshrc.split("\n");
  const alias = `alias ${Bun.env.CLI_NAME}="zsh ${path(BIN_PATH)}"`;
  if (zshrcContent.some((i) => i === alias)) {
    console.log(`zshrc already has ${alias}", skip add`);
  } else {
    await Bun.write(`${Bun.env.ZSH_RC}`, `${zshrc}\n${alias}`);
    console.log(`zshrc add "${alias}", use "source ${Bun.env.ZSH_RC}"`);
  }
};
const installForNu = async () => {
  if (!Bun.env.NU_CONFIG) {
    console.log(
      "You can add NU_CONFIG into your env and run `postinstall` again to use alias",
    );
    return;
  }
  if (!Bun.env.CLI_NAME) {
    console.log(
      "You can add CLI_NAME into your env and run `postinstall` again to use alias",
    );
    return;
  }
  const BIN_PATH = `./bin/bun-help.nu`;
  await Bun.write(
    BIN_PATH,
    `#!/usr/bin/env nu
def main [...@: string, --force (-f)] {
  exec bun "${path("./bin.ts")}" ...$@
}
`,
  );
  const configNu = await Bun.file(Bun.env.NU_CONFIG).text();
  const configNuContent = configNu.split("\n");
  const alias = `alias ${Bun.env.CLI_NAME} = nu ${path(BIN_PATH)}`;
  if (configNuContent.some((i) => i === alias)) {
    console.log(`config nu already has ${alias}", skip add`);
  } else {
    await Bun.write(Bun.env.NU_CONFIG, `${configNu}\n${alias}`);
    console.log(`config nu add "${alias}", use "source ${Bun.env.NU_CONFIG}"`);
  }
};
if (Bun.env.ZSH) {
  installForZsh();
} else if (Bun.env.NU_VERSION) {
  installForNu();
} else {
  console.log("CLI only support ZSH and Nu now.");
}
