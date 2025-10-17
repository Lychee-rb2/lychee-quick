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
} as const;
export const iconMap = (key: keyof typeof map) => {
  return map[key];
};
