/** Custom circular-economy loop logo mark */
export default function LogoMark({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="2" />
      {/* Top-right arc — forward loop */}
      <path
        d="M24 10 C14 10 8 18 12 26 L16 22 14 32 24 28 20 24 C18 20 20 14 24 14 Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bottom-left arc — return loop */}
      <path
        d="M24 38 C34 38 40 30 36 22 L32 26 34 16 24 20 28 24 C30 28 28 34 24 34 Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
