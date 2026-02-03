export interface MihomoConfig {
  mode: "direct" | "rule" | "global";
}

export interface MihomoProxy {
  now: string;
  name: string;
  history?: { delay: number; time: string }[];
  alive: boolean;
  all?: string[];
  type: "URLTest";
}
