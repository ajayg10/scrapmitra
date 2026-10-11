import { usePrefersReducedMotion } from './hooks';

const CALLOUTS = [
  {
    id: 1,
    num: '01',
    text: 'DEVICE MATCH',
    title: 'Looks like an iPhone 11.',
    desc: 'Visual model suggestion. Confirm the model in Settings or with a repairer.',
    row: 1,
    col: 1,
    align: 'left',
    svgDir: 'down'
  },
  {
    id: 2,
    num: '02',
    text: 'VISIBLE CONDITION',
    title: 'A crack. Not a verdict.',
    desc: 'Lower-right glass damage is visible. Display and touch still need testing.',
    row: 2,
    col: 1,
    align: 'left',
    svgDir: 'up'
  },
  {
    id: 3,
    num: '03',
    text: 'WHAT WE CAN\'T SEE',
    title: 'Battery health: unknown.',
    desc: 'Capacity, swelling and internal damage cannot be verified from this photo.',
    row: 1,
    col: 5,
    align: 'left',
    svgDir: 'down'
  },
  {
    id: 4,
    num: '04',
    text: 'YOUR INFORMATION',
    title: 'Keep your data yours.',
    desc: 'Back up and securely erase personal data before a transfer, if safe to do so.',
    row: 2,
    col: 5,
    align: 'left',
    svgDir: 'up'
  }
];

export default function DeviceDiscoverySection() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="discover" className="discover-section relative overflow-hidden bg-[var(--brand-green)] text-[#F4F1E8]" aria-labelledby="discover-heading">
      <style>{`
        .discover-section::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image: radial-gradient(rgba(244, 241, 232, 0.09) 1px, transparent 1px);
          background-size: calc(24*var(--u)) calc(24*var(--u));
          background-position: 0 0;
        }

        .discover-forest {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: auto;
          max-height: 260px;
          object-fit: cover;
          object-position: center bottom;
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 45%);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 45%);
        }
        @media(max-width: 699px) {
          .discover-forest {
            opacity: 0.22;
            max-height: 120px;
          }
        }

        .discover-scan-line {
          animation: scanLoop 4s ease-in-out infinite alternate;
        }
        @keyframes scanLoop {
          0% { top: 10%; }
          100% { top: 90%; }
        }

        .discover-stage {
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(48px, 5vw, 96px) auto clamp(48px, 5vw, 96px) minmax(0, 1fr);
          grid-template-rows: 1fr 1fr;
          align-items: center;
        }

        @media(max-width: 1099px) {
          .discover-stage {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
            gap: clamp(1.25rem, 3vw, 3rem);
          }
        }
        @media(max-width: 699px) {
          .discover-stage {
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }
        }
      `}</style>

      {/* Decorative Forest Bottom */}
      <img className="discover-forest" src="/images/forest.png" alt="" aria-hidden="true" />

      <div className="w-full max-w-[1120px] mx-auto relative z-10" 
           style={{ 
             paddingTop: 'clamp(2rem, 3.5vw, 3.5rem)',
             paddingBottom: 'clamp(4rem, 8vw, 8rem)',
             paddingLeft: 'clamp(1rem, 4vw, 2.5rem)',
             paddingRight: 'clamp(1rem, 4vw, 2.5rem)'
           }}>
        
        {/* Header */}
        <div className="flex flex-col min-[1100px]:flex-row min-[1100px]:justify-between min-[1100px]:items-end gap-6" 
             style={{ marginBottom: 'clamp(1rem, 2vw, 2rem)' }}>
          <div className="flex-1">
            <div className="font-spacemono text-[0.72rem] uppercase tracking-[0.18em] text-[#F4F1E8] opacity-65 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#E8472A] rounded-full opacity-100" />
              <span>03 / DISCOVER</span>
            </div>
            <h2 id="discover-heading" className="font-bricolage font-[800] leading-[1.08] tracking-[-0.02em]" 
                style={{ fontSize: 'clamp(1.75rem, 2.9vw, 2.9rem)', textWrap: 'balance' }}>
              One photo opens<br className="hidden min-[1100px]:block" /> 
              <span className="text-[#E8472A] relative inline-block pb-[0.15em]">
                a world of possibilities.
                <svg className="absolute w-[65%] h-[4px] left-0 bottom-0" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2,5 Q50,8 98,4" fill="none" stroke="#E8472A" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
          </div>
          <p className="font-sans text-[clamp(0.88rem,0.95vw,1rem)] text-left opacity-72 max-w-[34ch] leading-[1.6]">
            Meet LB-014: a black iPhone 11 found in a desk drawer. Start with a photo, then add what you know.
          </p>
        </div>

        {/* Stage Layout */}
        <div className="discover-stage">
          
          {/* Phone (Centered, spans 2 rows on desktop) */}
          <div className="relative flex items-center justify-center max-[1099px]:col-span-full max-[1099px]:mb-6 mx-auto" 
               style={{ 
                 gridColumn: '3', 
                 gridRow: '1 / span 2',
                 width: 'clamp(140px, 11vw, 200px)',
                 fontSize: 'min(14px, 1.5vw)' // Base em scale
               }}>
            
            {/* Dashed background circle */}
            <div className="absolute rounded-full border border-dashed border-[#F4F1E8] opacity-[0.15] w-[110%] aspect-square pointer-events-none" />
            
            {/* Corner brackets */}
            <div className="absolute w-[110%] h-[110%] pointer-events-none z-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,15 L0,0 L15,0 M85,0 L100,0 L100,15 M100,85 L100,100 L85,100 M15,100 L0,100 L0,85" fill="none" stroke="#F4F1E8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.8" />
              </svg>
            </div>

            {/* Phone Body */}
            <div className="relative w-full aspect-[1/2.05] rounded-[2em] border flex flex-col items-center justify-center overflow-hidden z-20"
                 style={{ 
                   backgroundColor: 'color-mix(in srgb, var(--brand-green) 35%, black)', 
                   borderColor: 'color-mix(in srgb, var(--brand-green) 60%, black)',
                   boxShadow: '4px 4px 0 color-mix(in srgb, var(--brand-green) 25%, black)' 
                 }}
                 aria-label="Illustration of a black iPhone 11 with a cracked screen">
              
              {/* Screen */}
              <div className="absolute top-[0.4em] bottom-[0.4em] left-[0.4em] right-[0.4em] rounded-[1.6em] overflow-hidden"
                   style={{ backgroundColor: 'color-mix(in srgb, var(--brand-green) 70%, black)' }}>
                
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[1.2em] rounded-b-[0.8em]"
                     style={{ backgroundColor: 'color-mix(in srgb, var(--brand-green) 35%, black)' }} />
                
                {/* Lockscreen Time & Text */}
                <div className="mt-[40%] flex flex-col items-center text-center">
                  <div className="font-sans font-medium leading-none tracking-tight" style={{ fontSize: '3.4em' }}>09:41</div>
                  <div className="opacity-70 mt-[0.4em]" style={{ fontSize: '0.6em' }}>A new day. A next beginning.</div>
                </div>
                
                {/* Plant / Crack Lines */}
                <svg className="absolute bottom-0 right-0 w-[80%] h-[50%] opacity-30" viewBox="0 0 100 100" fill="none" stroke="#F4F1E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M100,100 Q80,80 50,70 Q70,50 90,60" />
                  <path d="M50,70 Q40,60 30,70 Q40,80 50,70" />
                  <path d="M50,70 Q45,90 35,95" />
                  <path d="M40,80 L25,75 M35,95 L25,100" />
                </svg>

                {/* Home Bar */}
                <div className="absolute bottom-[0.8em] left-1/2 -translate-x-1/2 w-[35%] h-[0.3em] bg-[#F4F1E8] opacity-50 rounded-full" />
              </div>

              {/* Scan Line */}
              <div className="absolute w-[100%] left-0 h-[1.5px] bg-[#E8472A] z-30 discover-scan-line"
                   style={{ 
                     animation: reduced ? 'none' : 'scanLoop 4s ease-in-out infinite alternate',
                     boxShadow: '0 3px 10px rgba(232, 71, 42, 0.4)'
                   }} />
            </div>
          </div>

          {/* Render Callouts */}
          {CALLOUTS.map((callout) => (
            <div key={callout.id} 
                 className="relative w-full flex flex-col max-[1099px]:border-t max-[1099px]:border-[#F4F1E8]/20 max-[1099px]:pt-6"
                 style={{ 
                   gridColumn: callout.col, 
                   gridRow: callout.row, 
                   alignSelf: 'center' 
                 }}>
              
              <div className="mb-1 font-spacemono text-[0.68rem] tracking-[0.16em] uppercase text-[#F4F1E8] opacity-60">
                <span className="text-[#E8472A] opacity-100 font-bold">{callout.num}</span> / {callout.text}
              </div>
              
              <div className="relative w-full border-b border-[#F4F1E8]/45" style={{ paddingBottom: '0.5rem' }}>
                <h3 className="text-[clamp(1.05rem,1.3vw,1.35rem)] font-bricolage font-[800] text-balance leading-[1.2]">{callout.title}</h3>
                
                <svg className="absolute hidden min-[1100px]:block pointer-events-none" 
                     style={{ 
                       [callout.svgDir === 'down' ? 'top' : 'bottom']: callout.svgDir === 'down' ? '100%' : '0',
                       [callout.col === 1 ? 'left' : 'right']: '100%',
                       width: 'clamp(48px, 5vw, 96px)',
                       height: '60px',
                       overflow: 'visible' 
                     }} 
                     preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <marker id={`dot-${callout.id}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
                      <circle cx="5" cy="5" r="5" fill="#E8472A" />
                    </marker>
                  </defs>
                  {callout.col === 1 ? (
                    <path d={`M0,${callout.svgDir === 'down' ? 0 : 100} L100,${callout.svgDir === 'down' ? 100 : 0}`} fill="none" stroke="#F4F1E8" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" markerEnd={`url(#dot-${callout.id})`} />
                  ) : (
                    <path d={`M100,${callout.svgDir === 'down' ? 0 : 100} L0,${callout.svgDir === 'down' ? 100 : 0}`} fill="none" stroke="#F4F1E8" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" markerEnd={`url(#dot-${callout.id})`} />
                  )}
                </svg>
              </div>
              
              <p className="font-sans text-[clamp(0.82rem,0.9vw,0.95rem)] leading-[1.55] max-w-[32ch] opacity-72 text-pretty text-left"
                 style={{ marginTop: '0.6rem' }}>
                {callout.desc}
              </p>
            </div>
          ))}

        </div>

        {/* Footer Bar */}
        <div className="w-full border border-[#F4F1E8]/35 rounded-[8px] flex flex-col min-[700px]:flex-row min-[700px]:justify-between items-center text-center min-[700px]:text-left gap-3"
             style={{ marginTop: 'clamp(1.25rem, 2.5vw, 2.25rem)', padding: '0.7rem 1.1rem' }}>
          <div className="font-spacemono text-[0.68rem] uppercase tracking-wider opacity-90">
            LB-014 / VISUAL SCREENING ONLY
          </div>
          <div className="font-sans text-[0.8rem] opacity-72">
            AI suggests a starting point. A qualified person confirms the next step.
          </div>
        </div>

      </div>
    </section>
  );
}
