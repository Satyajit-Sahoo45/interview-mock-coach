export default function Button({
  children,
  onClick,
  variant = "primary", // primary | ghost | danger | gold
  size = "md", // sm | md | lg
  disabled = false,
  className = "",
  ...rest
}) {
  const base = `
    inline-flex items-center justify-center gap-2 font-display font-semibold
    rounded-xl transition-all duration-200 cursor-pointer select-none
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variants = {
    primary: `
      bg-accent text-bg hover:bg-accent-dim
      shadow-[0_0_20px_rgba(0,194,255,0.3)] hover:shadow-[0_0_30px_rgba(0,194,255,0.45)]
    `,
    ghost: `
      bg-transparent border border-border-light text-text
      hover:border-accent hover:text-accent hover:bg-accent/5
    `,
    danger: `
      bg-danger/10 border border-danger/30 text-danger
      hover:bg-danger/20 hover:border-danger/60
    `,
    gold: `
      bg-gold/10 border border-gold/30 text-gold
      hover:bg-gold/20 hover:border-gold/60
    `,
    success: `
      bg-success/10 border border-success/30 text-success
      hover:bg-success/20 hover:border-success/60
    `,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
