import { z } from "zod";

const requireEnv = (name: string): string =>
  z
    .string({ message: `Missing required environment variable: ${name}` })
    .parse(Bun.env[name]);

// Mihomo
export const MIHOMO_URL = () => requireEnv("MIHOMO_URL");
export const MIHOMO_TOKEN = () => requireEnv("MIHOMO_TOKEN");
export const MIHOMO_TOP_PROXY = () => requireEnv("MIHOMO_TOP_PROXY");
export const MIHOMO_BOARD = () => requireEnv("MIHOMO_BOARD");

// Vercel
export const VERCEL_PERSONAL_TOKEN = () => requireEnv("VERCEL_PERSONAL_TOKEN");
export const VERCEL_TEAM = () => requireEnv("VERCEL_TEAM");

// Redis
export const REDIS_URL = () => requireEnv("REDIS_URL");
export const REDIS_TOKEN = () => requireEnv("REDIS_TOKEN");

// Linear
export const LINEAR_API_KEY = () => requireEnv("LINEAR_API_KEY");
export const LINEAR_TEAM = () => requireEnv("LINEAR_TEAM");

// GitHub
export const GIT_TOKEN = () => requireEnv("GIT_TOKEN");
export const GIT_ORGANIZATION = () => requireEnv("GIT_ORGANIZATION");
export const GIT_REPO = () => requireEnv("GIT_REPO");

// With defaults
export const LOG_LEVEL = () => Bun.env.LOG_LEVEL || "info";
export const CLI_NAME = () => Bun.env.CLI_NAME || "ly";
export const LOCALE = () => Bun.env.LOCALE || "zh";

// Optional
export const RELEASE_NOTE_PAGE = () => Bun.env.RELEASE_NOTE_PAGE;
export const PREVIEWS_COMMENT_MENTIONS = () =>
  Bun.env.PREVIEWS_COMMENT_MENTIONS || "";
export const PREVIEWS_COMMENT_FOOTER = () => Bun.env.PREVIEWS_COMMENT_FOOTER;
