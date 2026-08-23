export default function HermesMark({ size = 36, className = '', animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label="Hermes">
      <defs>
        <linearGradient id="hm-mint" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7af0bd" />
          <stop offset="1" stopColor="#1fa974" />
        </linearGradient>
        <linearGradient id="hm-sky" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9bc4ff" />
          <stop offset="1" stopColor="#3b7dd8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" stroke="url(#hm-mint)" strokeOpacity="0.3" strokeWidth="0.8" strokeDasharray="2 4" className={animated ? 'origin-center' : ''} style={animated ? { transformOrigin: 'center', animation: 'spin 50s linear infinite' } : null} />
      <circle cx="32" cy="32" r="22" stroke="url(#hm-sky)" strokeOpacity="0.18" strokeWidth="0.6" />
      <path d="M40 14c5-2 9 0 12 3-3 0-5 1-7 3 3 0 6 1 8 4-4-1-7 0-10 2" stroke="url(#hm-sky)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M24 14c-5-2-9 0-12 3 3 0 5 1 7 3-3 0-6 1-8 4 4-1 7 0 10 2" stroke="url(#hm-sky)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="30.7" y="18" width="2.6" height="34" rx="1.3" fill="url(#hm-mint)" />
      <circle cx="32" cy="16" r="3" fill="url(#hm-mint)" />
      <circle cx="27.4" cy="13.5" r="1.4" fill="url(#hm-sky)" />
      <circle cx="36.6" cy="13.5" r="1.4" fill="url(#hm-sky)" />
      <path d="M32 24c-5 0-9 2-9 4.5s4 4 9 4 9-1.5 9-4S37 24 32 24z" fill="none" stroke="url(#hm-mint)" strokeWidth="1.4" />
      <path d="M32 33c-5 0-9 2-9 4.5s4 4 9 4 9-1.5 9-4S37 33 32 33z" fill="none" stroke="url(#hm-mint)" strokeWidth="1.4" />
      <path d="M32 42c-5 0-9 2-9 4.5s4 4 9 4 9-1.5 9-4S37 42 32 42z" fill="none" stroke="url(#hm-mint)" strokeWidth="1.4" />
    </svg>
  );
}
