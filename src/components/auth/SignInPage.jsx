// components/auth/SignInPage.jsx
// Shown when user is not signed in. Uses Clerk's hosted UI components.
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";

export default function SignInPage() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gold/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            border border-accent/20 bg-accent/5 text-accent text-xs font-mono mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            AI-Powered Mock Interviewer
          </div>
          <h1 className="font-display text-4xl font-extrabold mb-2">
            {mode === "signin" ? "Welcome back" : "Get started"}
          </h1>
          <p className="text-muted text-sm">
            {mode === "signin"
              ? "Sign in to access your interview history and settings."
              : "Create a free account to save your progress."}
          </p>
        </div>

        {/* Clerk component — handles all auth UI automatically */}
        <div className="flex justify-center">
          {mode === "signin" ? (
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "glass-card rounded-2xl p-6 shadow-none border-0 bg-transparent",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "w-full border border-border bg-card text-text hover:bg-subtle rounded-xl font-display font-semibold text-sm transition-all",
                  formFieldInput:
                    "w-full px-4 py-3 rounded-xl border border-border bg-card font-mono text-sm text-text placeholder:text-muted outline-none focus:border-accent",
                  formButtonPrimary:
                    "w-full bg-accent text-bg rounded-xl font-display font-bold py-3 hover:bg-accent-dim transition-all",
                  footerActionLink: "text-accent hover:underline",
                  dividerLine: "bg-border",
                  dividerText: "text-muted text-xs",
                },
              }}
            />
          ) : (
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "glass-card rounded-2xl p-6 shadow-none border-0 bg-transparent",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "w-full border border-border bg-card text-text hover:bg-subtle rounded-xl font-display font-semibold text-sm transition-all",
                  formFieldInput:
                    "w-full px-4 py-3 rounded-xl border border-border bg-card font-mono text-sm text-text placeholder:text-muted outline-none focus:border-accent",
                  formButtonPrimary:
                    "w-full bg-accent text-bg rounded-xl font-display font-bold py-3 hover:bg-accent-dim transition-all",
                  footerActionLink: "text-accent hover:underline",
                },
              }}
            />
          )}
        </div>

        {/* Toggle between sign in / sign up */}
        <p className="text-center text-muted text-sm mt-4">
          {mode === "signin"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            onClick={() =>
              setMode((m) => (m === "signin" ? "signup" : "signin"))
            }
            className="text-accent hover:underline font-medium"
          >
            {mode === "signin" ? "Sign up free" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
