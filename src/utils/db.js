// Retries a DB operation up to `maxAttempts` times with exponential backoff.
// Handles transient network errors and token-refresh races.
async function saveWithRetry(operation, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // Wait 500ms, 1000ms, 2000ms before retrying
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw lastError;
}

export async function saveSessionToDB(
  db,
  { userId, config, sessions, summary },
) {
  return saveWithRetry(async () => {
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
      if (qErr) {
        // Rollback: delete the parent row so we don't have orphaned session
        await db.from("interview_sessions").delete().eq("id", sessionRow.id);
        throw new Error(`Questions insert failed: ${qErr.message}`);
      }
    }

    return sessionRow;
  });
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

// ---------- MCQ Sessions -----------------

/**
 * Save a completed MCQ quiz + all question rows.
 * results = array of { question, category, options, correctIndex,
 *                      selectedIndex, correct, timedOut, explanation }
 * summary = AI summary object { percentage, rating, strongAreas, ... }
 */
export async function saveMCQSessionToDB(
  db,
  { userId, config, results, summary },
) {
  return saveWithRetry(async () => {
    const correct = results.filter((r) => r.correct).length;
    const wrong = results.filter((r) => !r.correct && !r.timedOut).length;
    const timedOut = results.filter((r) => r.timedOut).length;
    const pct =
      summary?.percentage ?? Math.round((correct / results.length) * 100);

    // 1. Insert parent mcq_session row
    const { data: sessionRow, error: sessionErr } = await db
      .from("mcq_sessions")
      .insert({
        user_id: userId,
        role: config.role,
        difficulty: config.difficulty,
        total_questions: results.length,
        correct_count: correct,
        wrong_count: wrong,
        timed_out_count: timedOut,
        percentage: pct,
        rating: summary?.rating || null,
        summary: summary || null,
        config: config,
      })
      .select()
      .single();

    if (sessionErr) throw new Error(sessionErr.message);

    // 2. Insert each question as a child row
    if (results.length) {
      const questionRows = results.map((r, i) => ({
        session_id: sessionRow.id,
        user_id: userId,
        question_index: i,
        question: r.question,
        category: r.category || null,
        options: r.options, // stored as JSON array
        correct_index: r.correctIndex,
        selected_index: r.timedOut ? null : r.selectedIndex,
        is_correct: r.correct,
        is_timed_out: r.timedOut || false,
        explanation: r.explanation || null,
      }));

      const { error: qErr } = await db
        .from("mcq_questions")
        .insert(questionRows);
      if (qErr) {
        // Rollback: delete the parent row
        await db.from("mcq_sessions").delete().eq("id", sessionRow.id);
        throw new Error(`MCQ questions insert failed: ${qErr.message}`);
      }
    }

    return sessionRow;
  });
}

/**
 * Load all MCQ sessions for a user, newest first.
 * Each session includes its child mcq_questions array.
 */
export async function loadMCQSessionsFromDB(db, userId) {
  const { data, error } = await db
    .from("mcq_sessions")
    .select(`*, mcq_questions (*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data || []).map((row) => ({
    id: row.id,
    savedAt: row.created_at,
    config: row.config,
    summary: row.summary,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    timedOutCount: row.timed_out_count,
    percentage: row.percentage,
    rating: row.rating,
    results: (row.mcq_questions || [])
      .sort((a, b) => a.question_index - b.question_index)
      .map((q) => ({
        question: q.question,
        category: q.category,
        options: q.options,
        correctIndex: q.correct_index,
        selectedIndex: q.selected_index,
        correct: q.is_correct,
        timedOut: q.is_timed_out,
        explanation: q.explanation,
      })),
  }));
}

/**
 * Delete a single MCQ session (cascades to mcq_questions via FK).
 */
export async function deleteMCQSessionFromDB(db, sessionId) {
  const { error } = await db.from("mcq_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
}

// ─── Compute Stats -----------

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

export function computeMCQStatsFromRows(rows) {
  if (!rows?.length) return null;
  const percentages = rows.map((r) => r.percentage || 0);
  const avg = Math.round(
    percentages.reduce((a, b) => a + b, 0) / percentages.length,
  );
  const best = Math.max(...percentages);
  const trend = percentages.slice(0, 5).reverse();
  const rc = {};
  rows.forEach((r) => {
    const role = r.config?.role || "unknown";
    rc[role] = (rc[role] || 0) + 1;
  });
  const topRole = Object.entries(rc).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { total: rows.length, avgPercent: avg, best, trend, topRole };
}
