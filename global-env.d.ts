
declare namespace NodeJS {
  export interface ProcessEnv {
    CLI_NAME?: string;
    LINEAR_API_KEY?: string;
    LINEAR_TEAM?: string;
    LINEAR_SPACE?: string;
    VERCEL_TEAM?: string;
    VERCEL_PROJECT?: string;
    VERCEL_PERSONAL_TOKEN?: string;
    GIT_ORGANIZATION?: string;
    GIT_REPO?: string;
    GIT_TOKEN?: string;
    REDIS_URL?: string;
    REDIS_TOKEN?: string;
    PREVIEWS_COMMENT_MENTIONS?: string;
    PREVIEWS_COMMENT_FOOTER?: string;
    RELEASE_NOTE_PAGE?: string;
    MIHOMO_URL?: string;
    MIHOMO_TOKEN?: string;
    MIHOMO_TOP_PROXY?: string;
    MIHOMO_BOARD?: string;
  }
}
