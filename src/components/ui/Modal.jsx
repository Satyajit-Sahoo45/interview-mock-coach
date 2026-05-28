import { useEffect } from "react";

/**
 * Modal — accessible overlay with backdrop click to close.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-lg",
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`relative z-10 w-full ${width} glass-card rounded-2xl p-6 shadow-2xl animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
