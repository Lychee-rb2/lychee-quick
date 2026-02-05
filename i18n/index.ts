import zh from "./zh.json";
import en from "./en.json";

export type NestedMessages = {
  [key: string]: string | NestedMessages;
};

type KeyPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: T[K] extends string
        ? Prefix extends ""
          ? K
          : `${Prefix}.${K}`
        : KeyPaths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export type MessageKeys = KeyPaths<typeof zh>;

export const getNestedValue = (
  obj: NestedMessages,
  path: string,
): string | undefined => {
  const keys = path.split(".");
  let current: string | NestedMessages | undefined = obj;

  for (const key of keys) {
    if (current === undefined || typeof current === "string") {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
};

export const t = (
  key: MessageKeys | string,
  args: Record<string, string> = {},
): string => {
  const locale = process.env.LOCALE || "zh";
  const messages = locale === "zh" ? zh : en;
  const message = getNestedValue(messages as NestedMessages, key);

  if (!message) {
    return key;
  }

  return message.replace(/{(\w+)}/g, (match, p1) => args[p1] ?? match);
};
