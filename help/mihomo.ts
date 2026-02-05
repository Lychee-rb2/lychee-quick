import { mihomo } from "@/fetch/mihomo";
import { MihomoProxy } from "@/types/mihomo";
import { searchProxy } from "./mihomo-select";

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

export const pickProxy = async (option: {
  data?: {
    current: MihomoProxy;
    proxies: Record<string, MihomoProxy>;
  };
  refresh?: boolean;
}): Promise<void> => {
  const { answer, state } = await searchProxy(
    {
      proxies: option?.data?.proxies || null,
      current: option?.data?.current,
    },
    { refresh: option?.refresh },
  );

  const { proxies, current } = state;

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
