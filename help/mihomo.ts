import { mihomo } from "@/fetch/mihomo";
import { MihomoProxy } from "@/types/mihomo";
import { search } from "@inquirer/prompts";
import { iconMap } from ".";

export const findCurrentProxy = async (): Promise<MihomoProxy[]> => {
  const proxies = await mihomo<{ proxies: Record<string, MihomoProxy> }>(
    `proxies`,
  );
  const mihomoProxy = proxies.proxies[process.env.MIHOMO_TOP_PROXY];
  return findProxyChain(mihomoProxy, proxies.proxies);
};

export function findProxyChain(
  current: MihomoProxy,
  proxies: Record<string, MihomoProxy>,
): MihomoProxy[] {
  if (current.now) {
    return [current, ...findProxyChain(proxies[current.now], proxies)];
  }
  return [current];
}
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
export const pickProxy = async (option: {
  data?: {
    current: MihomoProxy;
    proxies: Record<string, MihomoProxy>;
  };
  refresh?: boolean;
}): Promise<void> => {
  let proxies: Record<string, MihomoProxy> | null = option?.data?.proxies;
  let current = option?.data?.current;
  let hasRefreshed = false;
  const answer = await search({
    message: `Pick a proxy ${current?.name || process.env.MIHOMO_TOP_PROXY}`,
    source: async (searchTerm) => {
      if (!hasRefreshed && option?.refresh) {
        await getDelay();
        hasRefreshed = true;
      }
      if (!proxies) {
        await mihomo<{ proxies: Record<string, MihomoProxy> }>(`proxies`).then(
          (result) => {
            proxies = result.proxies;
            current = proxies[process.env.MIHOMO_TOP_PROXY];
          },
        );
      }
      const children = getChildren(current, proxies);
      if (!searchTerm) return choices(children);
      if (!isNaN(Number(searchTerm)))
        return choices(children.filter((i) => i.index === Number(searchTerm)));
      return choices(children.filter((i) => i.proxy.name.includes(searchTerm)));
    },
  });
  if (answer === "RESET") {
    await pickProxy({ refresh: true });
    return;
  }
  if (answer === "REFRESH") {
    await pickProxy({ data: { current, proxies }, refresh: true });
    return;
  }
  const selected = proxies[answer];
  await mihomo(`proxies/${encodeURIComponent(current.name)}`, {
    body: { name: selected.name },
    method: "PUT",
  });
  if (selected.all && selected.type !== "URLTest") {
    await pickProxy({ data: { current: selected, proxies } });
  }
};

export function getDelay(options: {
  timeout?: number;
  proxy: string;
}): Promise<number>;
export function getDelay(options?: {
  timeout?: number;
}): Promise<Record<string, number>>;
export async function getDelay(options?: { timeout?: number; proxy: string }) {
  const proxy = options?.proxy;
  const qs = new URLSearchParams({
    url: "https://www.gstatic.com/generate_204",
    timeout: `${options?.timeout || 1000}`,
  });
  if (proxy) {
    return await mihomo<{ delay: number }>(
      `proxies/${encodeURIComponent(proxy)}/delay?${qs.toString()}`,
    ).then((result) => result.delay);
  }
  return await mihomo<Record<string, number>>(
    `group/GLOBAL/delay?${qs.toString()}`,
  );
}
