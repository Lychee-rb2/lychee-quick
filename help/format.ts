const map = {
	//pr
	draft: "📋",
	open: "💚",
	closed: "🔴",
	merged: "💫",
	inReview: "💚",
	//linear status
	unstarted: "🌟",
	started: "🌊",
	completed: "🎯",
	canceled: "🚫",
	backlog: "📎",
	triage: "🔍",
	//vercel status
	vercel_ready: "✨",
	vercel_error: "💥",
	vercel_building: "🔨",
	vercel_queued: "⏳",
	vercel_initializing: "🔄",
	vercel_canceled: "🚫",
	vercel_deleted: "🗑️",
	//mihomo
	mihomo_rule: "🔍",
	mihomo_direct: "🚫",
	mihomo_global: "🌍",
	mihomo_active: "🔥",
	mihomo_delay_good: "🟢",
	mihomo_delay_normal: "🟡",
	mihomo_delay_bad: "🔴",
	mihomo_delay_very_bad: "🚫",
	mihomo_refresh: "🔄",
	mihomo_reset: "🔄",
} as const;
export const iconMap = (key: keyof typeof map) => {
	return map[key];
};
