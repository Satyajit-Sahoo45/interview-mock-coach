// components/auth/UserMenu.jsx
// Shown in the top bar on Home, History, and Settings screens.
// Displays the user's avatar and a dropdown with sign-out.
import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

export default function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
    user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
    "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card
          px-2 py-1.5 transition-all hover:border-border-light cursor-pointer"
      >
        {/* Avatar */}
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.fullName || "User"}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full bg-accent/20 text-accent
            text-xs font-bold flex items-center justify-center"
          >
            {initials}
          </div>
        )}
        <span className="text-xs font-mono text-muted max-w-[120px] truncate">
          {user.firstName ||
            user.emailAddresses?.[0]?.emailAddress ||
            "Account"}
        </span>
        <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 w-56 glass-card rounded-xl shadow-2xl
          border border-border z-50 overflow-hidden animate-fade-in"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-display font-semibold text-text truncate">
              {user.fullName || "User"}
            </div>
            <div className="text-xs font-mono text-muted truncate mt-0.5">
              {user.emailAddresses?.[0]?.emailAddress}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={() => {
                window.open("https://accounts.clerk.dev", "_blank");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                text-muted hover:text-text hover:bg-subtle/50 transition-all text-left"
            >
              👤 Manage account
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                text-danger hover:bg-danger/5 transition-all text-left"
            >
              🚪 Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
