// utils/db.js — All Supabase DB operations
// Every fn receives `db` — authenticated Supabase client from getSupabaseWithAuth(token)

export async function saveSessionToDB(
  db,
  { userId, config, sessions, summary },
) {
  const { data: sessionRow, error: sessionErr } = await db
    .from("interview_sessions")
    .insert({
      user_id: userId,
      role: config.role,
      type: config.type,
      difficulty: config.difficulty,
      overall_score: summary?.overallScore || null,
      overall_rating: summary?.overallRating || null,
      summary: summary || null,
      config: config,
    })
    .select()
    .single();

  if (sessionErr) throw new Error(sessionErr.message);

  if (sessions?.length) {
    const questionRows = sessions.map((s) => ({
      session_id: sessionRow.id,
      user_id: userId,
      question: s.question,
      category: s.category || null,
      answer: s.answer || null,
      feedback: s.feedback || null,
      retry_count: s.retryCount || 0,
      follow_up_q: s.followUpQ || null,
      follow_up_answer: s.followUpAnswer || null,
      follow_up_feedback: s.followUpFeedback || null,
    }));
    const { error: qErr } = await db
      .from("question_sessions")
      .insert(questionRows);
    if (qErr) throw new Error(qErr.message);
  }

  return sessionRow;
}

export async function loadSessionsFromDB(db, userId) {
  const { data, error } = await db
    .from("interview_sessions")
    .select(`*, question_sessions (*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data || []).map((row) => ({
    id: row.id,
    savedAt: row.created_at,
    config: row.config,
    summary: row.summary,
    sessions: (row.question_sessions || []).map((q) => ({
      question: q.question,
      category: q.category,
      answer: q.answer,
      feedback: q.feedback,
      retryCount: q.retry_count,
      followUpQ: q.follow_up_q,
      followUpAnswer: q.follow_up_answer,
      followUpFeedback: q.follow_up_feedback,
    })),
  }));
}

export async function deleteSessionFromDB(db, sessionId) {
  const { error } = await db
    .from("interview_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearAllSessionsFromDB(db, userId) {
  const { error } = await db
    .from("interview_sessions")
    .delete()
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function loadSettingsFromDB(db, userId) {
  const { data, error } = await db
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    provider: data.provider,
    questionCount: data.question_count,
    theme: data.theme,
    voiceEnabled: data.voice_enabled,
    autoSave: data.auto_save,
    showIdealTopics: data.show_ideal_topics,
  };
}

export async function saveSettingsToDB(db, userId, settings) {
  const { error } = await db.from("user_settings").upsert(
    {
      user_id: userId,
      provider: settings.provider,
      question_count: settings.questionCount,
      theme: settings.theme,
      voice_enabled: settings.voiceEnabled,
      auto_save: settings.autoSave,
      show_ideal_topics: settings.showIdealTopics,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export function computeStatsFromRows(rows) {
  if (!rows?.length) return null;
  const scores = rows
    .map((r) => Number(r.summary?.overallScore || 0))
    .filter(Boolean);
  const avg = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const trend = scores.slice(0, 5).reverse();
  const rc = {};
  rows.forEach((r) => {
    const role = r.config?.role || "unknown";
    rc[role] = (rc[role] || 0) + 1;
  });
  const topRole = Object.entries(rc).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { total: rows.length, avgScore: avg, best, trend, topRole };
}
