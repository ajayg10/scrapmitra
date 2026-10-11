const ScanIllustration = () => (
  <div className="flex flex-row flex-nowrap items-center justify-end w-full h-full max-[379px]:flex-wrap max-[379px]:justify-center" style={{ gap: '0.4em' }}>
    {/* Phone Outline with brackets */}
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '4.5em', height: '6.23em' }}>
      <svg className="absolute w-full h-full" viewBox="0 0 78 108" fill="none" stroke="#0F1A17" strokeWidth="2.5" strokeLinecap="square">
        <path d="M1 15 L1 1 L15 1" />
        <path d="M77 15 L77 1 L63 1" />
        <path d="M1 93 L1 107 L15 107" />
        <path d="M77 93 L77 107 L63 107" />
      </svg>
      <div className="border-[0.15em] border-[#0F1A17] bg-transparent relative flex flex-col justify-between items-center" style={{ width: '75%', height: '82%', borderRadius: '0.4em', padding: '0.3em 0' }}>
        <div className="bg-[#0F1A17] rounded-full" style={{ width: '1em', height: '0.15em' }} />
        <div className="bg-[#0F1A17] rounded-full" style={{ width: '1.5em', height: '0.15em' }} />
      </div>
    </div>

    {/* Pills */}
    <div className="flex flex-col justify-center" style={{ gap: '0.4em' }}>
      <div className="flex items-center w-max rounded-full bg-[#CFE0D2] border border-[#A9C2B0] font-sans font-medium text-[#0F1A17]"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /></svg>
        <span>Phone</span>
      </div>
      <div className="flex items-center w-max rounded-full bg-[#E9EDDF] border border-[#CFD8C6] font-sans font-medium text-[#0F1A17]"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="2" y1="20" x2="22" y2="20" /></svg>
        <span>Laptop</span>
      </div>
      <div className="flex items-center w-max rounded-full bg-[#E9EDDF] border border-[#CFD8C6] font-sans font-medium text-[#0F1A17]"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="16" rx="2" ry="2" /><line x1="9" y1="2" x2="15" y2="2" /></svg>
        <span>Battery</span>
      </div>
      <div className="flex items-center w-max rounded-full bg-[#F8D5CF] border border-[#EFB2A8] font-sans font-medium text-[#B3261E]"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="text-[#B3261E] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
        <span>E-waste risk</span>
      </div>
    </div>
  </div>
);

const OptionsIllustration = () => (
  <div className="flex items-center justify-end w-full h-full max-[379px]:justify-center">
    <div className="flex flex-col items-stretch justify-center" style={{ width: '11em', gap: '0.4em' }}>
      <div className="flex items-center rounded-full bg-[#CFE0D2] border border-[#A9C2B0] font-spacemono text-[#0F1A17] justify-start shadow-sm"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
        <span>Repair</span>
      </div>
      <div className="flex items-center rounded-full bg-[#FAF8F1] border border-[#D5D2C4] font-spacemono text-[#0F1A17] justify-start"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
        <span>Resell</span>
      </div>
      <div className="flex items-center rounded-full bg-[#FAF8F1] border border-[#D5D2C4] font-spacemono text-[#0F1A17] justify-start"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        <span>Donate</span>
      </div>
      <div className="flex items-center rounded-full bg-[#FAF8F1] border border-[#D5D2C4] font-spacemono text-[#0F1A17] justify-start"
        style={{ padding: '0.3em 0.8em', gap: '0.4em' }}>
        <svg style={{ width: '1.2em', height: '1.2em' }} className="flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        <span>Recycle</span>
      </div>
    </div>
  </div>
);

const RouteMapIllustration = () => (
  <div className="flex justify-end items-center w-full h-full max-[379px]:justify-center">
    <svg viewBox="0 0 190 130" className="block h-auto" style={{ width: '14em' }} preserveAspectRatio="xMidYMid meet">
      <path d="M20 65 Q 10 20, 80 15 T 160 30 Q 185 70, 165 110 T 60 120 Q 25 100, 20 65 Z" fill="#DDE8D9" />
      <path d="M 140 100 C 130 90, 70 100, 50 60 C 30 20, 80 30, 100 20" fill="none" stroke="#FAF8F1" strokeWidth="10" strokeLinecap="round" />
      <path d="M 140 100 C 130 90, 70 100, 50 60 C 30 20, 80 30, 100 20" fill="none" stroke="#0F1A17" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
      
      <g stroke="#5B7A6B" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 40 L35 30 L40 40 Z M35 40 V45" />
        <path d="M25 80 L30 72 L35 80 Z M30 80 V85" />
        <path d="M45 95 L49 87 L53 95 Z M49 95 V99" />
        <path d="M50 25 L55 16 L60 25 Z M55 25 V30" />
      </g>
      
      <svg x="131" y="91" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <svg x="90" y="70" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
      <svg x="90" y="6" width="14" height="20" viewBox="0 0 24 24" fill="#0F3D33">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="3" fill="#F4F1E8" />
      </svg>
      <svg x="40" y="50" width="14" height="20" viewBox="0 0 24 24" fill="#0F3D33">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="3" fill="#F4F1E8" />
      </svg>
    </svg>
  </div>
);


export default function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#F4F1E8]"
      style={{
        backgroundImage: 'radial-gradient(rgba(15,26,23,0.1) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0',
        padding: 'clamp(2rem, 3vw, 3.25rem) 0 clamp(1.5rem, 2.2vw, 2.5rem)'
      }}
    >
      <style>{`
        .problem-card {
          container-type: inline-size;
          container-name: card;
          background: #FAF8F1; 
        }
        .card-content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          column-gap: clamp(0.75rem, 1.5vw, 1.5rem);
          align-items: center;
        }
        .card-text-col {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .card-visual-col {
          min-width: 0;
          font-size: clamp(0.6rem, 2.1cqw, 0.8rem);
        }
        @container card (max-width: 379px) {
          .card-content {
            grid-template-columns: minmax(0, 1fr);
            row-gap: 1.5rem;
          }
          .card-visual-col {
            justify-self: center;
            font-size: 0.8rem;
          }
        }
        
        /* Artwork Wrappers rendered early in DOM. No z-index or opacity here. */
        .problem-art-container {
          position: absolute;
          top: 0;
          bottom: 0;
          height: 100%;
          width: auto;
          pointer-events: none;
        }
        .problem-art-left {
          left: 0;
        }
        .problem-art-right {
          right: 0;
        }
        
        /* Artwork Img styling */
        .problem-mountains {
          display: block;
          height: 100%;
          width: auto;
          max-width: 30vw;
          object-fit: contain;
          opacity: 0.8;
          mix-blend-mode: multiply;
          -webkit-mask-image: linear-gradient(to right, #000 65%, transparent);
          mask-image: linear-gradient(to right, #000 65%, transparent);
        }
        .problem-mountains-right {
          transform: scaleX(-1);
        }
        
        @media(max-width: 699px) {
          .problem-art-container {
            width: 20vw;
          }
          .problem-mountains {
            opacity: 0.3;
          }
        }
      `}</style>

      {/* Side Art (Mountains) MUST be rendered before the .z-10 container */}
      <div className="problem-art-container problem-art-left" aria-hidden="true">
        <img src="/images/mountains-left.png" alt="" className="problem-mountains problem-mountains-left" />
      </div>
      <div className="problem-art-container problem-art-right" aria-hidden="true">
        <img src="/images/mountains-left.png" alt="" className="problem-mountains problem-mountains-right" />
      </div>

      <div className="w-full max-w-[1720px] mx-auto relative z-10" style={{ padding: '0 clamp(1rem, 5.6vw, 6.5rem)' }}>
        
        {/* Header Block */}
        <div className="flex flex-col items-center text-center w-full mx-auto" style={{ marginBottom: 'clamp(1.25rem, 2vw, 2rem)' }}>
          <div className="font-spacemono font-[700] uppercase text-[#0F1A17]"
            style={{ fontSize: '11px', letterSpacing: '0.18em', marginBottom: '0.5rem' }}
          >
            02 — THE PROBLEM
          </div>
          
          <h2 className="font-bricolage font-[800] text-[#0F1A17]"
            style={{ 
              fontVariationSettings: '"opsz" 96',
              fontSize: 'clamp(1.5rem, 2.1vw, 2.6rem)',
              lineHeight: '1.15',
              maxWidth: '1200px',
              width: '100%',
              marginInline: 'auto'
            }}
          >
            <span style={{ textWrap: 'balance' }}>
              A drawer full of old tech is a resource waiting to be found.
            </span>
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 min-[1100px]:grid-cols-3 max-[1099px]:max-w-[640px] mx-auto items-stretch"
          style={{ gap: 'clamp(0.875rem, 1.5vw, 1.75rem)' }}
        >
          
          {/* Card 01 */}
          <div className="problem-card flex flex-col border-2 border-[#0F1A17] rounded-lg overflow-visible relative transition-shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0F3D33]"
            style={{ 
              padding: 'clamp(1.1rem, 1.5vw, 1.6rem)', 
              boxShadow: 'var(--card-shadow, 6px 6px 0 #0F3D33)'
            }}
          >
            <style>{`@media(max-width: 699px) { .problem-card:nth-child(1) { --card-shadow: 4px 4px 0 #0F3D33; } }`}</style>
            
            <div className="card-content h-full">
              {/* Left Column (Text) */}
              <div className="card-text-col flex flex-col">
                <div className="flex items-center gap-[0.6rem]" style={{ marginBottom: '0.6rem' }}>
                  <span className="font-spacemono text-[#0F1A17]" style={{ fontSize: '0.8rem' }}>01</span>
                  <div className="bg-[#0F3D33] rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <svg className="w-[1.1rem] h-[1.1rem] text-[#F4F1E8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  </div>
                </div>
                
                <h3 className="font-bricolage font-[600] text-[#0F1A17]" style={{ fontSize: 'clamp(1.05rem, 1.15vw, 1.35rem)', lineHeight: '1.2', marginBottom: '0.4rem', textWrap: 'balance' }}>
                  Know what you have
                </h3>
                <p className="text-[#5B6B64] font-sans" style={{ fontSize: 'clamp(0.85rem, 0.9vw, 0.98rem)', lineHeight: '1.55', maxWidth: '34ch' }}>
                  Identify devices, check condition, and detect hazardous components with AI vision.
                </p>
              </div>
              
              {/* Right Column (Visual) */}
              <div className="card-visual-col flex items-center justify-self-end w-full h-full">
                <ScanIllustration />
              </div>
            </div>
          </div>

          {/* Card 02 */}
          <div className="problem-card flex flex-col border-2 border-[#0F1A17] rounded-lg overflow-visible relative transition-shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0F3D33]"
            style={{ 
              padding: 'clamp(1.1rem, 1.5vw, 1.6rem)', 
              boxShadow: 'var(--card-shadow, 6px 6px 0 #0F3D33)'
            }}
          >
            <style>{`@media(max-width: 699px) { .problem-card:nth-child(2) { --card-shadow: 4px 4px 0 #0F3D33; } }`}</style>
            
            <div className="card-content h-full">
              {/* Left Column (Text) */}
              <div className="card-text-col flex flex-col">
                <div className="flex items-center gap-[0.6rem]" style={{ marginBottom: '0.6rem' }}>
                  <span className="font-spacemono text-[#0F1A17]" style={{ fontSize: '0.8rem' }}>02</span>
                  <div className="bg-[#0F3D33] rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <svg className="w-[1.1rem] h-[1.1rem] text-[#F4F1E8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  </div>
                </div>
                
                <h3 className="font-bricolage font-[600] text-[#0F1A17]" style={{ fontSize: 'clamp(1.05rem, 1.15vw, 1.35rem)', lineHeight: '1.2', marginBottom: '0.4rem', textWrap: 'balance' }}>
                  Find the right next step
                </h3>
                <p className="text-[#5B6B64] font-sans" style={{ fontSize: 'clamp(0.85rem, 0.9vw, 0.98rem)', lineHeight: '1.55', maxWidth: '34ch' }}>
                  Get AI-powered recommendations — repair, resale, donation, or authorised recycling.
                </p>
              </div>
              
              {/* Right Column (Visual) */}
              <div className="card-visual-col flex items-center justify-self-end w-full h-full">
                <OptionsIllustration />
              </div>
            </div>
          </div>

          {/* Card 03 */}
          <div className="problem-card flex flex-col border-2 border-[#0F1A17] rounded-lg overflow-visible relative transition-shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0F3D33]"
            style={{ 
              padding: 'clamp(1.1rem, 1.5vw, 1.6rem)', 
              boxShadow: 'var(--card-shadow, 6px 6px 0 #0F3D33)'
            }}
          >
            <style>{`@media(max-width: 699px) { .problem-card:nth-child(3) { --card-shadow: 4px 4px 0 #0F3D33; } }`}</style>
            
            <div className="card-content h-full">
              {/* Left Column (Text) */}
              <div className="card-text-col flex flex-col">
                <div className="flex items-center gap-[0.6rem]" style={{ marginBottom: '0.6rem' }}>
                  <span className="font-spacemono text-[#0F1A17]" style={{ fontSize: '0.8rem' }}>03</span>
                  <div className="bg-[#0F3D33] rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <svg className="w-[1.1rem] h-[1.1rem] text-[#F4F1E8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                  </div>
                </div>
                
                <h3 className="font-bricolage font-[600] text-[#0F1A17]" style={{ fontSize: 'clamp(1.05rem, 1.15vw, 1.35rem)', lineHeight: '1.2', marginBottom: '0.4rem', textWrap: 'balance' }}>
                  Make every pickup count
                </h3>
                <p className="text-[#5B6B64] font-sans" style={{ fontSize: 'clamp(0.85rem, 0.9vw, 0.98rem)', lineHeight: '1.55', maxWidth: '34ch' }}>
                  Combine nearby requests, optimize collector routes, and reduce wasted trips.
                </p>
              </div>
              
              {/* Right Column (Visual) */}
              <div className="card-visual-col flex items-center justify-self-end w-full h-full">
                <RouteMapIllustration />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
