/**
 * Drawn, photo-style scenes for example news rows. They stand in for licensed article photos until a
 * news feed with image rights is connected, and never depict a real person.
 */
export type DemoPhoto = "podium" | "skyline" | "rigs";

export function DemoPhotoArt({ kind, className }: { kind: DemoPhoto; className?: string }) {
  const id = `dp-${kind}`;
  return (
    <svg viewBox="0 0 112 76" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      {kind === "podium" && (
        <>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#1b2a4a" /><stop offset="1" stopColor="#0a1122" /></linearGradient>
            <radialGradient id={`${id}-l`} cx="0.62" cy="0.3" r="0.6"><stop offset="0" stopColor="#7fa6e8" stopOpacity="0.55" /><stop offset="1" stopColor="#7fa6e8" stopOpacity="0" /></radialGradient>
            <linearGradient id={`${id}-suit`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2c3446" /><stop offset="1" stopColor="#11151f" /></linearGradient>
            <linearGradient id={`${id}-skin`} x1="0" x2="1"><stop offset="0" stopColor="#c99a7e" /><stop offset="1" stopColor="#8d6550" /></linearGradient>
          </defs>
          <rect width="112" height="76" fill={`url(#${id}-bg)`} />
          {/* flag, out of focus */}
          <g opacity="0.55" transform="translate(0 4) skewY(-4)">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x="0" y={i * 6} width="34" height="3" fill="#b8323f" />)}
            <rect x="0" y="0" width="16" height="20" fill="#28407a" />
          </g>
          <rect width="112" height="76" fill={`url(#${id}-l)`} />
          {[[88, 12, 5], [100, 30, 3], [76, 8, 2.5], [96, 52, 4]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#cfe0ff" opacity="0.18" />)}
          {/* speaker, seen from behind the cameras: no face detail */}
          <path d="M40 76c0-15 7-24 20-26 13 2 20 11 20 26z" fill={`url(#${id}-suit)`} />
          <path d="M55 50l5 9 5-9z" fill="#e9edf3" />
          <path d="M59 52l1 10 1-10z" fill="#7d1d2a" />
          <ellipse cx="60" cy="36" rx="9" ry="11" fill={`url(#${id}-skin)`} />
          <path d="M51 33c0-8 4-12 9-12s9 4 9 12c-2-4-5-5-9-5s-7 1-9 5z" fill="#d9dde3" />
          {/* lectern and microphones */}
          <path d="M34 62h52l-4 14H38z" fill="#5a3b26" />
          <rect x="34" y="60" width="52" height="4" rx="1" fill="#6e4a30" />
          <path d="M52 60l4-12M68 60l-4-12" stroke="#1a1a1a" strokeWidth="1.2" />
          <circle cx="56" cy="47" r="1.8" fill="#222" /><circle cx="64" cy="47" r="1.8" fill="#222" />
        </>
      )}
      {kind === "skyline" && (
        <>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2b1d1a" /><stop offset="1" stopColor="#120c0b" /></linearGradient>
            <radialGradient id={`${id}-f`} cx="0.5" cy="0.62" r="0.45"><stop offset="0" stopColor="#fff2b0" /><stop offset="0.25" stopColor="#ffb13b" /><stop offset="0.6" stopColor="#e2541c" stopOpacity="0.85" /><stop offset="1" stopColor="#7a2310" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="112" height="76" fill={`url(#${id}-bg)`} />
          {[[38, 22, 16], [58, 16, 19], [78, 24, 15], [48, 30, 14], [70, 34, 13]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#5b4a44" opacity="0.65" />)}
          {[[44, 26, 10], [64, 20, 12], [74, 30, 9]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#8a6a58" opacity="0.4" />)}
          <ellipse cx="56" cy="47" rx="40" ry="26" fill={`url(#${id}-f)`} />
          <path d="M0 76V58h8v-6h6v8h5V50h7v10h6v-4h5v8h4V54h8v10h5v-6h9v8h6V52h7v12h5v-8h6v6h7V56h6v20z" fill="#0b0807" />
          {[[12, 62], [28, 64], [60, 66], [86, 64], [96, 66]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="1.6" height="1.6" fill="#ffb13b" opacity="0.8" />)}
        </>
      )}
      {kind === "rigs" && (
        <>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2a3550" /><stop offset="0.45" stopColor="#c0633a" /><stop offset="0.7" stopColor="#f2a24a" /><stop offset="1" stopColor="#3a2418" /></linearGradient>
            <radialGradient id={`${id}-s`} cx="0.55" cy="0.66" r="0.3"><stop offset="0" stopColor="#fff1c4" /><stop offset="0.4" stopColor="#ffc861" stopOpacity="0.8" /><stop offset="1" stopColor="#ffc861" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="112" height="76" fill={`url(#${id}-bg)`} />
          <circle cx="62" cy="50" r="22" fill={`url(#${id}-s)`} />
          <g fill="none" stroke="#120c09" strokeWidth="1.3">
            <path d="M20 66L30 14 40 66M23 50h14M26 34h8M30 14h26M56 14v10" />
            <path d="M23 50l11-16M37 50L26 34" strokeWidth="0.8" />
            <path d="M74 66L82 24 90 66M76 54h12M79 40h6M82 24l22 10M104 34v8" />
            <path d="M76 54l9-14M88 54l-9-14" strokeWidth="0.8" />
          </g>
          <path d="M0 66h112v10H0z" fill="#1a110c" />
          <path d="M8 70h96" stroke="#f2a24a" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="6 4" />
        </>
      )}
    </svg>
  );
}
