export * from "./logger";
export * from "./git";
export * from "./cli";
export * from "./io";
export * from "./format";
export * from "./util";

export type FalseType = "" | 0 | false | null | undefined;

export const typedBoolean = <Value>(
  value: Value,
): value is Exclude<Value, FalseType> => Boolean(value);
