export function StageIcon({ type }: { type: string }) {
  const cls = "w-7 h-7"
  switch (type) {
    case "프레스":
      // Industrial hydraulic press machine icon
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Top beam */}
          <rect x="2" y="2" width="20" height="3.5" rx="1" />
          {/* Left column */}
          <rect x="2" y="5.5" width="3" height="13" rx="0.5" />
          {/* Right column */}
          <rect x="19" y="5.5" width="3" height="13" rx="0.5" />
          {/* Hydraulic ram */}
          <rect x="9" y="5.5" width="6" height="7" rx="0.5" />
          {/* Ram tip / die */}
          <rect x="7" y="12.5" width="10" height="3" rx="0.5" />
          {/* Base anvil */}
          <rect x="4" y="18.5" width="16" height="3" rx="1" />
          {/* Safety stripe on anvil */}
          <line x1="7" y1="18.5" x2="7" y2="21.5" strokeWidth="0.8" strokeOpacity="0.5" />
          <line x1="10" y1="18.5" x2="10" y2="21.5" strokeWidth="0.8" strokeOpacity="0.5" />
          <line x1="13" y1="18.5" x2="13" y2="21.5" strokeWidth="0.8" strokeOpacity="0.5" />
          <line x1="16" y1="18.5" x2="16" y2="21.5" strokeWidth="0.8" strokeOpacity="0.5" />
        </svg>
      )
    case "차체":
      // Robot arm with welding spark icon
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Robot base */}
          <rect x="2" y="19" width="7" height="3" rx="1" />
          {/* Arm segment 1 */}
          <line x1="5.5" y1="19" x2="8" y2="13" />
          {/* Joint 1 */}
          <circle cx="8" cy="13" r="1.2" fill="currentColor" stroke="none" />
          {/* Arm segment 2 */}
          <line x1="8" y1="13" x2="13" y2="8" />
          {/* Joint 2 */}
          <circle cx="13" cy="8" r="1.2" fill="currentColor" stroke="none" />
          {/* Arm segment 3 / weld tip */}
          <line x1="13" y1="8" x2="16" y2="5" />
          {/* Welding tip nozzle */}
          <path d="M15 4 L17 4 L16 6 Z" fill="currentColor" stroke="none" />
          {/* Spark lines */}
          <line x1="17" y1="3" x2="19" y2="2" strokeWidth="1" />
          <line x1="18" y1="4.5" x2="20" y2="4" strokeWidth="1" />
          <line x1="17.5" y1="6" x2="19.5" y2="6.5" strokeWidth="1" />
          {/* Car body silhouette */}
          <path d="M2 16 L4 13 L9 13 L10 16" strokeWidth="1.2" />
          <line x1="2" y1="16" x2="10" y2="16" strokeWidth="1.2" />
        </svg>
      )
    case "도장":
      // Paint spray gun icon
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Gun body */}
          <rect x="2" y="9" width="11" height="6" rx="1.5" />
          {/* Nozzle */}
          <path d="M13 10.5 L18 9 L18 15 L13 13.5" />
          {/* Trigger guard */}
          <path d="M6 15 L5 19 L9 19 L8 15" />
          {/* Handle */}
          <rect x="5.5" y="19" width="3" height="2" rx="0.5" />
          {/* Paint mist spray dots */}
          <circle cx="20" cy="10" r="0.8" fill="currentColor" stroke="none" strokeOpacity="0.7" />
          <circle cx="21.5" cy="12" r="1" fill="currentColor" stroke="none" strokeOpacity="0.5" />
          <circle cx="20" cy="14" r="0.8" fill="currentColor" stroke="none" strokeOpacity="0.7" />
          <circle cx="22.5" cy="10.5" r="0.6" fill="currentColor" stroke="none" strokeOpacity="0.4" />
          <circle cx="22.5" cy="13.5" r="0.6" fill="currentColor" stroke="none" strokeOpacity="0.4" />
        </svg>
      )
    case "의장":
      // Assembly conveyor + wrench icon
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Conveyor belt base */}
          <rect x="1" y="17" width="22" height="4" rx="2" />
          {/* Conveyor rollers */}
          <circle cx="4" cy="19" r="1.5" />
          <circle cx="20" cy="19" r="1.5" />
          {/* Belt surface line */}
          <line x1="4" y1="17" x2="20" y2="17" strokeDasharray="2 2" strokeWidth="1" />
          {/* Part on conveyor */}
          <rect x="9" y="14" width="6" height="3" rx="0.5" />
          {/* Wrench */}
          <path d="M14 3 C16 3 17.5 4.5 17.5 6.5 C17.5 7.5 17 8.3 16.3 8.8 L10 13 L8.5 11.5 L13.2 7.7 C12.6 7 12.5 5.5 13 4.5" strokeWidth="1.3" />
          <circle cx="15" cy="6" r="2.2" strokeWidth="1.3" />
          {/* Screwdriver */}
          <line x1="4" y1="3" x2="10" y2="9" strokeWidth="1.3" />
          <path d="M3 2 L5 2 L5 4 L3 4 Z" strokeWidth="1" />
        </svg>
      )
    case "AI 연계 분석":
      // Network flow / data analysis icon
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Central hub node */}
          <circle cx="12" cy="12" r="2.5" />
          {/* Top node */}
          <circle cx="12" cy="4" r="1.8" />
          {/* Bottom-left node */}
          <circle cx="5" cy="18" r="1.8" />
          {/* Bottom-right node */}
          <circle cx="19" cy="18" r="1.8" />
          {/* Connections */}
          <line x1="12" y1="5.8" x2="12" y2="9.5" />
          <line x1="10.8" y1="14" x2="6.2" y2="16.7" />
          <line x1="13.2" y1="14" x2="17.8" y2="16.7" />
          {/* Trend arrow on top node */}
          <path d="M9 4 L10.2 2.5 L11.8 4 L12 4" strokeWidth="1" />
          {/* Data flow indicator */}
          <path d="M15 9 L17 7 L19 9" strokeWidth="1" />
          <line x1="17" y1="7" x2="17" y2="11" strokeWidth="1" />
        </svg>
      )
    default:
      return null
  }
}

export function RiskIndicator({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${
            i <= level ? (level >= 4 ? "bg-destructive" : level >= 2 ? "bg-warning" : "bg-success") : "bg-secondary"
          }`}
        />
      ))}
    </div>
  )
}

export function ImpactBar({ value }: { value: number }) {
  const getColor = (val: number) => {
    if (val >= 0.3) return "bg-destructive"
    if (val >= 0.2) return "bg-orange-500"
    if (val >= 0.15) return "bg-warning"
    return "bg-success"
  }

  return (
    <div className="w-20 h-3 bg-secondary rounded overflow-hidden">
      <div className={`h-full ${getColor(value)}`} style={{ width: `${value * 200}%` }} />
    </div>
  )
}
