const KEY = "interviewai_sessions";

/**
 * Save a completed session with full data.
 */
export function saveSession({ config, sessions, summary }) {
  try {
    const all = loadAllSessions();
    const entry = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      config,
      sessions,
      summary,
    };
    all.unshift(entry);
    // Keep last 30 sessions
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 30)));
    return entry;
  } catch (_) {
    return null;
  }
}

/**
 * Load all past sessions, newest first.
 */
export function loadAllSessions() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (_) {
    return [];
  }
}

/**
 * Delete a single session by id.
 */
export function deleteSession(id) {
  try {
    const filtered = loadAllSessions().filter((s) => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(filtered));
  } catch (_) {}
}

/**
 * Clear all sessions.
 */
export function clearAllSessions() {
  localStorage.removeItem(KEY);
}

/**
 * Compute aggregate stats across all saved sessions.
 */
export function computeStats() {
  const all = loadAllSessions();
  if (!all.length) return null;

  const scores = all
    .map((s) => Number(s.summary?.overallScore || 0))
    .filter(Boolean);
  const avgScore = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : 0;

  const best = Math.max(...scores);
  const trend = scores.slice(0, 5).reverse(); // last 5, chronological

  const roleCount = {};
  all.forEach((s) => {
    const r = s.config?.role || "unknown";
    roleCount[r] = (roleCount[r] || 0) + 1;
  });
  const topRole = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  return { total: all.length, avgScore, best, trend, topRole };
}
