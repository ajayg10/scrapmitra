const ITEMS = [
  'REPAIR BEFORE REPLACE',
  'KEEP MATERIALS IN CIRCULATION',
  'SAFER HANDLING',
  'LESS WASTE, MORE VALUE',
];

export default function TickerBanner() {
  const items = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <div className="relative flex-none w-full h-[calc(53*var(--u))] bg-[#0F3D33] overflow-hidden flex items-center border-t border-[#0F1A17]/10">
      <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite] relative z-10">
        {items.map((item, i) => (
          <span key={i} className="flex items-center font-spacemono text-[#F4F1E8] text-[calc(13*var(--u))] font-[400] tracking-[0.2em]">
            <span className="text-[#F5B82E] mx-[calc(32*var(--u))] text-[calc(14*var(--u))]">✦</span>
            {item}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
