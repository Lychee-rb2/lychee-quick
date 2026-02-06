import { mihomo } from "@/fetch/mihomo";
import { MihomoProxy } from "@/types/mihomo";
import { search } from "@inquirer/prompts";
import { iconMap } from "@/help/format";
import { getDelay } from "@/help/mihomo";

export function getProxyDelay(proxy: MihomoProxy) {
  return proxy.history?.at(-1)?.delay;
}

export function delayLevel(delay: number) {
  if (delay === 0) return "mihomo_delay_very_bad" as const;
  if (delay < 100) return "mihomo_delay_good" as const;
  if (delay < 300) return "mihomo_delay_normal" as const;
  return "mihomo_delay_bad" as const;
}

export const choices = (
  proxies: { proxy: MihomoProxy; delay: number; index: number }[],
) => [
  ...proxies.map(({ proxy, delay, index }) => {
    if (proxy.type === "URLTest") {
      return {
        name: `[${index}] ${iconMap(delayLevel(delay))}${proxy.name} -> ${proxy.now} (${delay}ms)`,
        value: proxy.name,
      };
    }
    return {
      name: `[${index}] ${iconMap(delayLevel(delay))}${proxy.name} (${delay}ms)`,
      value: proxy.name,
    };
  }),
  { name: `${iconMap("mihomo_refresh")} Refresh`, value: "REFRESH" },
  { name: `${iconMap("mihomo_reset")} Reset`, value: "RESET" },
];

export const getChildren = (
  proxy: MihomoProxy,
  proxies: Record<string, MihomoProxy>,
) => {
  return (proxy.all || []).map((name, index) => {
    const proxy = proxies[name];
    const delay = getProxyDelay(proxy);
    return { proxy, delay, index };
  });
};

export interface SearchProxyState {
  proxies: Record<string, MihomoProxy> | null;
  current: MihomoProxy | undefined;
}

export interface SearchProxyResult {
  answer: string;
  state: SearchProxyState;
}

export const searchProxy = async (
  state: SearchProxyState,
  options: {
    refresh?: boolean;
  } = {},
): Promise<SearchProxyResult> => {
  let { proxies, current } = state;
  let hasRefreshed = false;

  const answer = await search({
    message: `Pick a proxy ${current?.name || process.env.MIHOMO_TOP_PROXY}`,
    source: async (searchTerm) => {
      if (!hasRefreshed && options?.refresh) {
        await getDelay();
        hasRefreshed = true;
      }
      if (!proxies) {
        const result = await mihomo<{ proxies: Record<string, MihomoProxy> }>(
          `proxies`,
        );
        proxies = result.proxies;
        current = proxies[process.env.MIHOMO_TOP_PROXY];
      }
      // At this point, proxies and current should be defined
      if (!proxies || !current) {
        throw new Error("Failed to load proxies");
      }
      const children = getChildren(current, proxies);
      if (!searchTerm) return choices(children);
      if (!isNaN(Number(searchTerm)))
        return choices(children.filter((i) => i.index === Number(searchTerm)));
      return choices(children.filter((i) => i.proxy.name.includes(searchTerm)));
    },
  });

  // Ensure proxies and current are defined before returning
  if (!proxies || !current) {
    throw new Error("Proxies or current proxy is not available");
  }

  return {
    answer,
    state: {
      proxies,
      current,
    },
  };
};
