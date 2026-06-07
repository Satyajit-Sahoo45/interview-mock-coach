// components/recruiter/JobPostingForm.jsx
// Create or edit a job posting with custom questions
// AI can auto-generate questions from job description
import { useState, useEffect } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import DotLoader from "../ui/DotLoader";
import { useToast } from "../ui/Toast";
import { ROLES, DIFFICULTIES } from "../../utils/prompts";
import {
  getMyCompany,
  createCompany,
  updateCompany,
  createJobPosting,
  updateJobPosting,
  saveJobQuestions,
  getJobQuestions,
} from "../../utils/db-recruiter";
import { sanitizeInput, LIMITS } from "../../utils/sanitize";
import useDB from "../../hooks/useDB";
import { loadSettings } from "../../utils/storage";

function getApiModule() {
  const provider = loadSettings().provider || "gemini";
  switch (provider) {
    case "gemini":
      return import("../../utils/api.js");
    case "openai":
      return import("../../utils/api-openai.js");
    default:
      return import("../../utils/api-claude.js");
  }
}

const EMPTY_QUESTION = {
  question_text: "",
  question_type: "open",
  ideal_answer: "",
  weight: 1,
};

export default function JobPostingForm({ existingJob, onSaved, onBack }) {
  const { db, userId } = useDB();
  const toast = useToast();
  const isEditing = !!existingJob;

  // Company
  const [company, setCompany] = useState(null);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    size: "",
    website: "",
    description: "",
  });
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  // Job form
  const [form, setForm] = useState({
    title: existingJob?.title || "",
    description: existingJob?.description || "",
    role: existingJob?.role || "",
    difficulty: existingJob?.difficulty || "mid",
    location: existingJob?.location || "",
    salary_range: existingJob?.salary_range || "",
    pass_threshold: existingJob?.pass_threshold ?? 7,
    total_questions: existingJob?.total_questions ?? 5,
    deadline: existingJob?.deadline || "",
  });

  // Questions
  const [questions, setQuestions] = useState([{ ...EMPTY_QUESTION }]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1=company, 2=job details, 3=questions

  useEffect(() => {
    if (!db || !userId) return;
    (async () => {
      const co = await getMyCompany(db, userId);
      setCompany(co);
      if (co) {
        setCompanyForm({
          name: co.name,
          industry: co.industry || "",
          size: co.size || "",
          website: co.website || "",
          description: co.description || "",
        });
        setStep(2);
      }
      if (isEditing) {
        const qs = await getJobQuestions(db, existingJob.id);
        if (qs.length)
          setQuestions(
            qs.map((q) => ({
              question_text: q.question_text,
              question_type: q.question_type,
              ideal_answer: q.ideal_answer || "",
              weight: q.weight || 1,
            })),
          );
        setStep(2);
      }
    })();
  }, [db, userId]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.warn("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      if (company) {
        await updateCompany(db, company.id, companyForm);
        setCompany({ ...company, ...companyForm });
      } else {
        const co = await createCompany(db, userId, companyForm);
        setCompany(co);
      }
      toast.success("Company profile saved!");
      setShowCompanyForm(false);
      setStep(2);
    } catch (e) {
      toast.error("Failed to save company.");
    } finally {
      setSaving(false);
    }
  };

  // AI auto-generate questions from job description
  const handleAutoGenerate = async () => {
    if (!form.role) {
      toast.warn("Select a role first.");
      return;
    }
    if (!form.description.trim()) {
      toast.warn("Add a job description first.");
      return;
    }
    setGenerating(true);
    try {
      const { fetchAutoQuestions } = await getApiModule();
      if (!fetchAutoQuestions)
        throw new Error("fetchAutoQuestions not exported from api module");
      const result = await fetchAutoQuestions(
        form.title || form.role,
        form.role,
        form.difficulty,
        form.description,
        form.total_questions,
      );
      if (result?.questions?.length) {
        setQuestions(
          result.questions.map((q) => ({
            question_text: q.question_text || "",
            question_type: q.question_type || "open",
            ideal_answer: q.ideal_answer || "",
            weight: q.weight || 1,
          })),
        );
        toast.success(`${result.questions.length} questions generated!`);
      }
    } catch (e) {
      toast.error("Auto-generate failed. Add questions manually.");
    } finally {
      setGenerating(false);
    }
  };

  const addQuestion = () =>
    setQuestions((qs) => [...qs, { ...EMPTY_QUESTION }]);
  const removeQuestion = (i) =>
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const updateQuestion = (i, key, val) =>
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === i ? { ...q, [key]: val } : q)),
    );

  const handleSaveJob = async () => {
    if (!form.title.trim()) {
      toast.warn("Job title is required.");
      return;
    }
    if (!form.role) {
      toast.warn("Select a role.");
      return;
    }
    const validQs = questions.filter((q) => q.question_text.trim());
    if (!validQs.length) {
      toast.warn("Add at least one question.");
      return;
    }

    setSaving(true);
    try {
      const jobData = {
        ...form,
        description: sanitizeInput(form.description, LIMITS.JOB_DESCRIPTION),
        deadline: form.deadline || null,
      };

      let jobId;
      if (isEditing) {
        await updateJobPosting(db, existingJob.id, jobData);
        jobId = existingJob.id;
      } else {
        const job = await createJobPosting(db, userId, company.id, jobData);
        jobId = job.id;
      }

      await saveJobQuestions(
        db,
        jobId,
        userId,
        validQs.map((q) => ({
          ...q,
          question_text: sanitizeInput(q.question_text, 500),
          ideal_answer: sanitizeInput(q.ideal_answer || "", 1000),
        })),
      );

      toast.success(isEditing ? "Job updated!" : "Job posted successfully!");
      onSaved();
    } catch (e) {
      toast.error("Failed to save job: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -left-40
        w-96 h-96 rounded-full bg-gold/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={onBack}
            className="text-muted hover:text-text text-sm font-mono mb-4
              flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-display text-3xl font-extrabold">
            {isEditing ? "Edit Job" : "Post a"}{" "}
            <span className="text-gradient-gold">Job</span>
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "Company" },
            { n: 2, label: "Job Details" },
            { n: 3, label: "Questions" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold font-mono transition-all
                ${
                  step >= s.n
                    ? "bg-gold text-bg"
                    : "bg-subtle text-muted border border-border"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span
                className={`text-xs font-mono ${step >= s.n ? "text-text" : "text-muted"}`}
              >
                {s.label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* ── STEP 1: Company ── */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-base text-text">
                  Company Profile
                </h2>
                <p className="text-muted text-xs mt-0.5">
                  Shown to candidates browsing jobs.
                </p>
              </div>
              {company && !showCompanyForm && (
                <div className="flex items-center gap-2">
                  <Badge color="success">✓ {company.name}</Badge>
                  <button
                    onClick={() => setShowCompanyForm(true)}
                    className="text-xs font-mono text-accent hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {(!company || showCompanyForm) && (
              <div className="space-y-3">
                <FormInput
                  label="Company Name *"
                  value={companyForm.name}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, name: v }))}
                  placeholder="Acme Corp"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Industry"
                    value={companyForm.industry}
                    onChange={(v) =>
                      setCompanyForm((f) => ({ ...f, industry: v }))
                    }
                    placeholder="Technology"
                  />
                  <FormSelect
                    label="Company Size"
                    value={companyForm.size}
                    onChange={(v) => setCompanyForm((f) => ({ ...f, size: v }))}
                    options={[
                      { value: "", label: "Select size" },
                      { value: "1-10", label: "1–10 employees" },
                      { value: "11-50", label: "11–50" },
                      { value: "51-200", label: "51–200" },
                      { value: "200+", label: "200+" },
                    ]}
                  />
                </div>
                <FormInput
                  label="Website"
                  value={companyForm.website}
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, website: v }))
                  }
                  placeholder="https://acme.com"
                />
                <FormTextarea
                  label="Company Description"
                  value={companyForm.description}
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, description: v }))
                  }
                  placeholder="Tell candidates about your company..."
                  rows={3}
                />
                <Button onClick={handleSaveCompany} disabled={saving}>
                  {saving
                    ? "Saving..."
                    : company
                      ? "Update Company"
                      : "Save & Continue →"}
                </Button>
              </div>
            )}
          </Card>

          {/* ── STEP 2: Job Details ── */}
          {(step >= 2 || isEditing) && (
            <Card className="p-5">
              <h2 className="font-display font-bold text-base text-text mb-4">
                Job Details
              </h2>
              <div className="space-y-4">
                <FormInput
                  label="Job Title *"
                  value={form.title}
                  onChange={(v) => setField("title", v)}
                  placeholder="Senior Frontend Developer"
                />
                <div className="grid grid-cols-2 gap-3">
                  {/* Role */}
                  <div>
                    <label className="text-xs font-mono text-muted block mb-1.5">
                      Role *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setField("role", r.id)}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-mono
                            transition-all cursor-pointer text-left
                            ${
                              form.role === r.id
                                ? "border-gold bg-gold/10 text-gold"
                                : "border-border text-muted hover:border-border-light hover:text-text"
                            }`}
                        >
                          {r.icon} {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Difficulty */}
                  <div>
                    <label className="text-xs font-mono text-muted block mb-1.5">
                      Level *
                    </label>
                    <div className="space-y-1.5">
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setField("difficulty", d.id)}
                          className={`w-full py-2 px-3 rounded-lg border text-xs
                            font-mono transition-all cursor-pointer text-left
                            ${
                              form.difficulty === d.id
                                ? "border-gold bg-gold/10 text-gold"
                                : "border-border text-muted hover:text-text"
                            }`}
                        >
                          {d.label}{" "}
                          <span className="opacity-60">({d.range})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Location"
                    value={form.location}
                    onChange={(v) => setField("location", v)}
                    placeholder="Remote / New York, NY"
                  />
                  <FormInput
                    label="Salary Range"
                    value={form.salary_range}
                    onChange={(v) => setField("salary_range", v)}
                    placeholder="$80k–$120k"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Pass threshold */}
                  <div>
                    <label className="text-xs font-mono text-muted block mb-1.5">
                      Pass Threshold (1–10)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={form.pass_threshold}
                        onChange={(e) =>
                          setField("pass_threshold", Number(e.target.value))
                        }
                        className="flex-1 accent-gold"
                      />
                      <span className="text-gold font-mono font-bold w-6 text-center">
                        {form.pass_threshold}
                      </span>
                    </div>
                    <p className="text-xs text-muted/60 font-mono mt-1">
                      Candidates scoring ≥{form.pass_threshold} qualify
                    </p>
                  </div>
                  {/* Questions count */}
                  <div>
                    <label className="text-xs font-mono text-muted block mb-1.5">
                      Questions
                    </label>
                    <div className="flex gap-2">
                      {[3, 5, 7, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setField("total_questions", n)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-mono
                            transition-all cursor-pointer
                            ${
                              form.total_questions === n
                                ? "border-gold bg-gold/10 text-gold"
                                : "border-border text-muted hover:text-text"
                            }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="text-xs font-mono text-muted block mb-1.5">
                    Application Deadline (optional)
                  </label>
                  <input
                    type="date"
                    value={form.deadline ? form.deadline.split("T")[0] : ""}
                    onChange={(e) => setField("deadline", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 rounded-xl border border-border
                      bg-card text-text font-mono text-sm outline-none
                      focus:border-gold"
                  />
                </div>

                <FormTextarea
                  label="Job Description"
                  value={form.description}
                  onChange={(v) => setField("description", v)}
                  placeholder="Describe the role, responsibilities, requirements..."
                  rows={5}
                  maxLength={3000}
                />
                <p className="text-xs text-muted/60 font-mono">
                  {form.description.length}/3000 chars
                </p>

                <Button
                  onClick={() => setStep(3)}
                  disabled={!form.title || !form.role}
                >
                  Next: Add Questions →
                </Button>
              </div>
            </Card>
          )}

          {/* ── STEP 3: Questions ── */}
          {(step >= 3 || isEditing) && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-base text-text">
                    Interview Questions
                  </h2>
                  <p className="text-muted text-xs mt-0.5">
                    Candidates answer these. AI scores against your ideal
                    answer.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="gold"
                  onClick={handleAutoGenerate}
                  disabled={generating || !form.description.trim()}
                >
                  {generating ? "✦ Generating..." : "✦ AI Generate"}
                </Button>
              </div>

              {generating && (
                <div className="py-8 flex items-center justify-center">
                  <DotLoader label="Generating questions from job description..." />
                </div>
              )}

              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-border bg-subtle/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted">
                        Question {i + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Weight */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted">
                            Weight:
                          </span>
                          {[1, 2, 3].map((w) => (
                            <button
                              key={w}
                              onClick={() => updateQuestion(i, "weight", w)}
                              className={`w-6 h-6 rounded text-xs font-mono border
                                transition-all cursor-pointer
                                ${
                                  q.weight === w
                                    ? "bg-gold/20 border-gold/40 text-gold"
                                    : "border-border text-muted hover:text-text"
                                }`}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                        {questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(i)}
                            className="text-danger/60 hover:text-danger text-lg
                              transition-colors leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={q.question_text}
                      onChange={(e) =>
                        updateQuestion(i, "question_text", e.target.value)
                      }
                      rows={2}
                      placeholder="e.g. Describe a time you had to debug a complex production issue..."
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-lg border border-border
                        bg-bg font-body text-sm text-text placeholder:text-muted
                        outline-none focus:border-gold resize-none"
                    />

                    <textarea
                      value={q.ideal_answer}
                      onChange={(e) =>
                        updateQuestion(i, "ideal_answer", e.target.value)
                      }
                      rows={2}
                      placeholder="Ideal answer criteria (AI uses this to score the candidate)..."
                      maxLength={1000}
                      className="w-full px-3 py-2 rounded-lg border border-border/50
                        bg-bg/50 font-body text-xs text-text/70 placeholder:text-muted/60
                        outline-none focus:border-gold/50 resize-none"
                    />
                    <p className="text-xs font-mono text-muted/50">
                      ↑ Optional — helps AI score more accurately
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="ghost" size="sm" onClick={addQuestion}>
                  + Add Question
                </Button>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  onClick={handleSaveJob}
                  disabled={saving}
                  size="lg"
                  className="w-full"
                >
                  {saving
                    ? "Saving..."
                    : isEditing
                      ? "Update Job Posting"
                      : "Publish Job Posting →"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
function FormInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-xs font-mono text-muted block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card
          font-body text-sm text-text placeholder:text-muted
          outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
}) {
  return (
    <div>
      <label className="text-xs font-mono text-muted block mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card
          font-body text-sm text-text placeholder:text-muted
          outline-none focus:border-gold transition-colors resize-none"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-mono text-muted block mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card
          font-body text-sm text-text outline-none focus:border-gold transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
