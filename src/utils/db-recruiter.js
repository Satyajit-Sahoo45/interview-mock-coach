export async function getUserRole(db, userId) {
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role || null;
}

// Guarded: prevents switching if active jobs or in-progress applications exist
export async function setUserRole(db, userId, newRole) {
  if (newRole === "candidate") {
    const { data: activeJobs } = await db
      .from("job_postings")
      .select("id")
      .eq("recruiter_id", userId)
      .eq("status", "active")
      .limit(1);
    if (activeJobs?.length)
      throw new Error(
        "Close your active job postings before switching to Candidate.",
      );
  }

  if (newRole === "recruiter") {
    const { data: activeApps } = await db
      .from("job_applications")
      .select("id")
      .eq("candidate_id", userId)
      .eq("status", "in_progress")
      .limit(1);
    if (activeApps?.length)
      throw new Error(
        "Complete your in-progress applications before switching to Recruiter.",
      );
  }

  const { error } = await db
    .from("user_roles")
    .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  return newRole;
}

// ─── Company ──────────────────────────────────────────────────────────────────

export async function createCompany(db, recruiterId, data) {
  const { data: row, error } = await db
    .from("companies")
    .insert({ recruiter_id: recruiterId, ...data })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function getMyCompany(db, recruiterId) {
  const { data } = await db
    .from("companies")
    .select("*")
    .eq("recruiter_id", recruiterId)
    .maybeSingle();
  return data;
}

export async function updateCompany(db, companyId, data) {
  const { error } = await db
    .from("companies")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
}

// ─── Job Postings ─────────────────────────────────────────────────────────────

export async function createJobPosting(db, recruiterId, companyId, data) {
  const { data: row, error } = await db
    .from("job_postings")
    .insert({ recruiter_id: recruiterId, company_id: companyId, ...data })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function updateJobPosting(db, jobId, data) {
  const { error } = await db
    .from("job_postings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function getMyJobPostings(db, recruiterId) {
  const { data, error } = await db
    .from("job_postings")
    .select("*, companies(name, logo_url)")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getActiveJobs(db, { role, difficulty, search } = {}) {
  let query = db
    .from("job_postings")
    .select("*, companies(name, logo_url, industry)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (search) query = query.ilike("title", `%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getJobById(db, jobId) {
  const { data, error } = await db
    .from("job_postings")
    .select("*, companies(name, logo_url, industry, website, description)")
    .eq("id", jobId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Job Questions ────────────────────────────────────────────────────────────

export async function saveJobQuestions(db, jobId, recruiterId, questions) {
  await db.from("job_questions").delete().eq("job_id", jobId);
  if (!questions.length) return;
  const rows = questions.map((q, i) => ({
    job_id: jobId,
    recruiter_id: recruiterId,
    question_text: q.question_text,
    question_type: q.question_type || "open",
    options: q.options || null,
    correct_index: q.correct_index ?? null,
    ideal_answer: q.ideal_answer || null,
    weight: q.weight || 1,
    order_index: i,
  }));
  const { error } = await db.from("job_questions").insert(rows);
  if (error) throw new Error(error.message);
}

export async function getJobQuestions(db, jobId) {
  const { data, error } = await db
    .from("job_questions")
    .select("*")
    .eq("job_id", jobId)
    .order("order_index");
  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Applications ─────────────────────────────────────────────────────────────

export async function createApplication(
  db,
  { jobId, candidateId, candidateName, candidateEmail },
) {
  const { data: existing } = await db
    .from("job_applications")
    .select("id, status")
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (existing) return { ...existing, alreadyApplied: true };

  const { data, error } = await db
    .from("job_applications")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
      candidate_name: candidateName || null,
      candidate_email: candidateEmail || null,
      status: "in_progress",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function completeApplication(
  db,
  applicationId,
  { score, passed, summary },
) {
  const { error } = await db
    .from("job_applications")
    .update({
      status: passed ? "passed" : "failed",
      overall_score: score,
      passed,
      summary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);
}

export async function saveApplicationAnswers(
  db,
  applicationId,
  jobId,
  candidateId,
  answers,
) {
  const rows = answers.map((a) => ({
    application_id: applicationId,
    job_id: jobId,
    question_id: a.questionId || null,
    candidate_id: candidateId,
    question_text: a.question,
    answer: a.answer,
    feedback: a.feedback || null,
    score: a.feedback?.score || null,
  }));
  const { error } = await db.from("application_answers").insert(rows);
  if (error) throw new Error(error.message);
}

export async function getMyApplications(db, candidateId) {
  const { data, error } = await db
    .from("job_applications")
    .select(
      "*, job_postings(title, role, difficulty, pass_threshold, companies(name, logo_url))",
    )
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Recruiter Dashboard ──────────────────────────────────────────────────────

export async function getApplicationsForJob(db, jobId) {
  const { data, error } = await db
    .from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .order("overall_score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateApplicationStatus(db, applicationId, status) {
  const valid = [
    "in_progress",
    "completed",
    "passed",
    "failed",
    "shortlisted",
    "rejected",
  ];
  if (!valid.includes(status)) throw new Error("Invalid status");
  const { error } = await db
    .from("job_applications")
    .update({ status })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);
}

export async function getApplicationWithAnswers(db, applicationId) {
  const { data: app, error: appErr } = await db
    .from("job_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (appErr) throw new Error(appErr.message);
  const { data: answers, error: ansErr } = await db
    .from("application_answers")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at");
  if (ansErr) throw new Error(ansErr.message);
  return { ...app, answers: answers || [] };
}
