export default function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        color: light ? 'rgba(214,227,210,0.75)' : '#66766E',
        margin: '0 0 14px',
      }}
    >
      {children}
    </p>
  );
}
