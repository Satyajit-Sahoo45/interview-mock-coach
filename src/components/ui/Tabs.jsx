/**
 * Tabs — a simple pill-style tab switcher.
 *
 * Usage:
 *   <Tabs tabs={[{id:'a', label:'Tab A'}, {id:'b', label:'Tab B'}]}
 *         active="a" onChange={setTab} />
 */
export default function Tabs({ tabs, active, onChange, className = "" }) {
  return (
    <div className={`inline-flex bg-subtle rounded-xl p-1 gap-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold
            transition-all duration-200 cursor-pointer
            ${
              active === tab.id
                ? "bg-card text-text shadow-sm border border-border"
                : "text-muted hover:text-text"
            }
          `}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.badge != null && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-mono">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
