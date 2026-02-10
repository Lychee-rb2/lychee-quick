import { MIHOMO_URL, MIHOMO_TOKEN } from "@/help/env";
import { t } from "@/i18n";

export const mihomo = async <RES, T = unknown>(
  uri: string,
  { headers, body, ...options }: Omit<RequestInit, "body"> & { body: T } = {
    body: undefined,
  },
) => {
  const mihomoUrl = MIHOMO_URL();
  const mihomoToken = MIHOMO_TOKEN();
  try {
    const response = await fetch(`${mihomoUrl}/${uri}`, {
      headers: {
        authorization: `Bearer ${mihomoToken}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      let errorDetails: unknown;

      try {
        errorDetails = JSON.parse(errorText);
        if (
          typeof errorDetails === "object" &&
          errorDetails !== null &&
          "message" in errorDetails
        ) {
          errorMessage = String(errorDetails.message);
        } else {
          errorMessage = errorText;
        }
      } catch {
        errorMessage = errorText || response.statusText;
      }

      // 针对特定状态码提供更友好的错误信息
      if (response.status === 504 || response.status === 408) {
        throw new Error(t("error.mihomo.timeout", { detail: errorMessage }));
      }
      if (response.status === 503) {
        throw new Error(t("error.mihomo.unavailable", { detail: errorMessage }));
      }
      if (response.status === 404) {
        throw new Error(t("error.mihomo.notFound", { uri }));
      }

      throw new Error(
        t("error.mihomo.requestFailed", {
          status: String(response.status),
          detail: errorMessage,
        }),
      );
    }
    return response.json() as Promise<RES>;
  } catch (error) {
    // 如果是我们抛出的错误，直接重新抛出
    if (error instanceof Error) {
      throw error;
    }
    // 处理网络错误等其他异常
    throw new Error(t("error.mihomo.networkError", { error: String(error) }));
  }
};
