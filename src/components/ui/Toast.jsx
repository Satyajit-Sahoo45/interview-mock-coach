import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
} from "react";

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, exiting: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 350);
  }, []);

  const toast = useCallback(
    ({ message, type = "info", duration = 3500 }) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type, exiting: false }]);
      timerRef.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  // Expose shorthand helpers
  toast.success = (msg, opts) =>
    toast({ message: msg, type: "success", ...opts });
  toast.error = (msg, opts) => toast({ message: msg, type: "error", ...opts });
  toast.info = (msg, opts) => toast({ message: msg, type: "info", ...opts });
  toast.warn = (msg, opts) => toast({ message: msg, type: "warn", ...opts });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Portal */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Single toast item ────────────────────────────────────────────────────────
const STYLES = {
  success: {
    icon: "✓",
    border: "border-success/30",
    bg: "bg-success/10",
    text: "text-success",
  },
  error: {
    icon: "✕",
    border: "border-danger/30",
    bg: "bg-danger/10",
    text: "text-danger",
  },
  warn: {
    icon: "⚠",
    border: "border-warn/30",
    bg: "bg-warn/10",
    text: "text-warn",
  },
  info: {
    icon: "ℹ",
    border: "border-accent/30",
    bg: "bg-accent/10",
    text: "text-accent",
  },
};

function ToastItem({ toast, onDismiss }) {
  const s = STYLES[toast.type] || STYLES.info;
  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3
        px-4 py-3 rounded-xl border glass-card
        min-w-[260px] max-w-[360px] shadow-2xl
        transition-all duration-350
        ${s.border} ${s.bg}
        ${toast.exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}
      `}
    >
      <span className={`text-sm font-bold shrink-0 ${s.text}`}>{s.icon}</span>
      <p className="text-sm text-text flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-muted hover:text-text transition-colors text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  );
}
