export const mihomo = async <RES, T = unknown>(
  uri: string,
  { headers, body, ...options }: Omit<RequestInit, "body"> & { body: T } = {
    body: undefined,
  },
) => {
  const response = await fetch(`${process.env.MIHOMO_URL}/${uri}`, {
    headers: {
      authorization: `Bearer ${process.env.MIHOMO_TOKEN}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to fetch ${uri}: ${response.statusText}`);
  }
  return response.json() as Promise<RES>;
};
