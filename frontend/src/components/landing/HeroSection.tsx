import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './hooks';

export default function HeroSection() {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const fi = (delay: number) => ({
    opacity: reduced || mounted ? 1 : 0,
    transform: reduced || mounted ? 'none' : 'translateY(15px)',
    transition: reduced ? 'none' : `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
  });

  return (
    <section 
      id="hero" 
      className="hero w-full h-[calc(620*var(--u))] relative overflow-hidden bg-[#F4F1E8] max-[899px]:h-auto max-[899px]:min-h-0 max-[899px]:flex-auto max-[899px]:py-8 max-[899px]:sm:py-12"
      style={{
        backgroundImage: 'radial-gradient(rgba(15,26,23,0.1) 1px, transparent 1px)',
        backgroundSize: 'calc(24*var(--u)) calc(24*var(--u))',
        backgroundPosition: '0 0'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
        .font-caveat { font-family: 'Caveat', cursive; }
        
        @media(min-width: 900px) {
          .hero-inner {
            width: calc(1586*var(--u)); margin: 0 auto; height: 100%; position: relative; z-index: 10; background: transparent;
            display: grid; grid-template-columns: calc(554*var(--u)) calc(816*var(--u));
            padding: 0 calc(84*var(--u)) 0 calc(132*var(--u));
          }
          .hero-left {
            align-self: start; margin-top: calc(38*var(--u)); display: flex; flex-direction: column; align-items: flex-start; min-width: 0;
          }
          .eyebrow { 
            margin-bottom: calc(20*var(--u)); font-size: calc(12*var(--u)); line-height: calc(16*var(--u)); 
            letter-spacing: 0.2em; text-transform: uppercase; font-family: 'Space Mono', monospace; color: #4E625A; white-space: nowrap;
          }
          .hero-title { 
            margin-bottom: calc(40*var(--u)); font-size: calc(68*var(--u)); line-height: 1.0; 
            font-weight: 800; letter-spacing: -0.03em;
          }
          .accent-word { position: relative; display: inline-block; padding-bottom: 0.3em; }
          .accent-word .squiggle { 
            position: absolute; left: 0.02em; bottom: 0; 
            width: 56%; aspect-ratio: 200 / 22; height: auto; 
            display: block; overflow: visible; pointer-events: none; 
          }
          
          .hero-sub { 
            margin-bottom: calc(28*var(--u)); font-size: calc(19*var(--u)); line-height: 1.6; 
            max-width: calc(470*var(--u)); color: #5B6B64; 
          }
          .hero-cta { margin-bottom: calc(26*var(--u)); display: flex; gap: calc(24*var(--u)); flex-wrap: nowrap; }
          .trust { display: flex; align-items: center; gap: calc(5*var(--u)); white-space: nowrap; }
          
          .hero-image {
            align-self: start; margin-top: calc(42*var(--u)); width: calc(816*var(--u)); height: calc(521*var(--u));
            border: calc(3*var(--u)) solid #0F1A17; border-radius: 0; box-shadow: calc(10*var(--u)) calc(10*var(--u)) 0 #F0522D; position: relative;
          }

          .hero-floating-card {
            position: absolute; left: calc(74*var(--u)); top: calc(54*var(--u)); width: calc(335*var(--u)); height: calc(147*var(--u));
            border-radius: calc(8*var(--u)); padding: calc(16*var(--u));
            box-shadow: 0 calc(8*var(--u)) calc(24*var(--u)) rgba(0,0,0,0.12);
          }
          .hero-badge {
            position: absolute; right: calc(50*var(--u)); top: calc(24*var(--u)); width: calc(98*var(--u)); height: calc(98*var(--u)); border-radius: 50%;
            box-shadow: inset 0 0 0 calc(4*var(--u)) #0F3D33, inset 0 0 0 calc(6*var(--u)) #F4F1E8;
          }
          .hero-note {
            position: absolute; left: calc(690*var(--u)); top: calc(192*var(--u)); width: calc(96*var(--u)); font-size: calc(22*var(--u)); transform: rotate(-12deg);
          }
          .hero-arrow {
            position: absolute; left: calc(724*var(--u)); top: calc(300*var(--u)); width: calc(44*var(--u)); height: calc(48*var(--u)); stroke-width: calc(2.5*var(--u));
          }
          .hero-sparkle-1 {
            position: absolute; left: calc(540*var(--u)); top: calc(40*var(--u)); width: calc(24*var(--u)); height: calc(24*var(--u)); transform: rotate(-55deg); stroke-width: calc(2*var(--u));
          }
          .hero-sparkle-2 {
            position: absolute; left: calc(555*var(--u)); top: calc(65*var(--u)); width: calc(18*var(--u)); height: calc(18*var(--u)); transform: rotate(-20deg); stroke-width: calc(2*var(--u));
          }
        }

        @media(max-width: 899px) {
          .hero-inner {
            display: flex; flex-direction: column; padding: 0 16px; gap: 28px; background: transparent; max-width: 600px; margin: 0 auto;
          }
          .hero-left { display: flex; flex-direction: column; min-width: 0; }
          .eyebrow { margin-bottom: 12px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-family: 'Space Mono', monospace; color: #4E625A; }
          .hero-title { font-size: clamp(32px, 8.5vw, 42px); margin-bottom: 16px; white-space: normal; line-height: 1.08; letter-spacing: -0.03em; }
          .accent-word { position: relative; display: inline-block; padding-bottom: 0.18em; }
          .accent-word .squiggle { 
            position: absolute; left: 0; bottom: 0; 
            width: 58%; aspect-ratio: 200 / 22; height: auto; 
            display: block; overflow: visible; pointer-events: none; 
          }
          .hero-sub { font-size: 15px; line-height: 1.5; margin-bottom: 20px; color: #5B6B64; }
          .hero-cta { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; width: 100%; }
          .hero-btn-primary { width: 100% !important; height: 48px !important; font-size: 15px !important; padding: 0 20px !important; border-radius: 6px !important; border-width: 2px !important; box-shadow: 3px 3px 0 #F0A530 !important; }
          .hero-btn-secondary { width: 100% !important; height: 48px !important; font-size: 15px !important; padding: 0 20px !important; border-radius: 6px !important; border-width: 2px !important; box-shadow: 3px 3px 0 #0F1A17 !important; }
          .trust { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
          
          .hero-image { width: 100%; aspect-ratio: 816/521; border: 2.5px solid #0F1A17; box-shadow: 5px 5px 0 #F0522D; position: relative; overflow: hidden; }
          
          .hero-floating-card {
            position: absolute; left: 3.5%; top: 5%; width: clamp(170px, 50%, 250px);
            background: white; border-radius: 6px; padding: clamp(6px, 1.8vw, 10px);
            box-shadow: 0 4px 14px rgba(0,0,0,0.14);
          }
          .hero-badge {
            position: absolute; right: 3.5%; top: 4%; width: clamp(52px, 15vw, 72px); height: clamp(52px, 15vw, 72px); border-radius: 50%;
            background: #0F3D33; color: #F4F1E8;
            box-shadow: inset 0 0 0 2px #0F3D33, inset 0 0 0 4px #F4F1E8;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
          .hero-note {
            position: absolute; right: 4%; bottom: 6%; font-family: 'Caveat', cursive; color: white;
            font-size: clamp(12px, 3.2vw, 16px); line-height: 1.1; transform: rotate(-10deg);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          }
          .hero-arrow {
            position: absolute; right: 12%; bottom: 22%; width: 24px; height: 26px; stroke-width: 2px;
          }
          .hero-sparkle-1 {
            position: absolute; right: 28%; top: 8%; width: 16px; height: 16px; transform: rotate(-55deg); stroke-width: 2px;
          }
          .hero-sparkle-2 {
            position: absolute; right: 24%; top: 16%; width: 12px; height: 12px; transform: rotate(-20deg); stroke-width: 2px;
          }
        }

        .trees { position:absolute; bottom:0; width:calc(360*var(--u)); height:calc(222*var(--u)); background-image:url('/images/trees-left.png?v=3'); background-repeat:no-repeat; background-size:contain; background-position:left bottom; pointer-events:none; z-index:1; opacity:.8; mix-blend-mode:multiply; }
        .trees-left { left:0; }
        .trees-right { right:0; transform:scaleX(-1); }
      `}</style>

      {/* Trees outside hero-inner */}
      <div className="trees trees-left hidden min-[900px]:block" />
      <div className="trees trees-right hidden min-[900px]:block" />

      <div className="hero-inner">
        {/* ── LEFT: Text ── */}
        <div className="hero-left">
          <div 
            className="eyebrow"
            style={fi(0)}
          >
            E-WASTE, REIMAGINED / 01 — THE SECOND LIFE
          </div>

          <h1 
            className="hero-title font-bricolage text-[#0F1A17]"
            style={{ ...fi(150), fontVariationSettings: '"opsz" 96' }}
          >
            <div>Your old tech</div>
            <div>isn't the end.</div>
            <div>It's the <span className="text-[#E8472A]">next</span></div>
            <div>
              <span className="accent-word text-[#E8472A]">
                beginning.
                {/* Squiggle underline */}
                <svg
                  className="squiggle"
                  viewBox="0 0 200 22"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="#E8472A"
                    d="M2 14 C22 8 42 6.5 62 9 C82 11.5 100 13.5 125 10.5 C150 7.5 175 4.5 198 4.8 L198 6.6 C176 8.5 152 14.5 124 17.5 C98 20.5 80 18.5 60 15.5 C40 12.5 22 14 2 16.5 Z"
                  />
                </svg>
              </span>
            </div>
          </h1>

          <p 
            className="hero-sub" 
            style={fi(300)}
          >
            Give discarded electronics a better next step&nbsp;— repair, reuse, resell, or recycle safely.
          </p>

          {/* Buttons */}
          <div className="hero-cta" style={fi(420)}>
            <a 
              href="/app" 
              className="hero-btn-primary inline-flex items-center justify-center whitespace-nowrap flex-none font-bricolage font-[600] leading-none transition-transform hover:-translate-y-px"
              style={{ 
                height: 'calc(54*var(--u))', 
                padding: '0 calc(28*var(--u))', 
                gap: 'calc(10*var(--u))', 
                fontSize: 'calc(18*var(--u))', 
                border: 'calc(2*var(--u)) solid #0F1A17', 
                borderRadius: 'calc(4*var(--u))',
                width: 'calc(235*var(--u))',
                background: '#0F3D33',
                color: '#F4F1E8',
                boxShadow: 'calc(4*var(--u)) calc(4*var(--u)) 0 #F0A530'
              }}
            >
              Find its next life <svg className="w-4 h-4 min-[900px]:w-[calc(16*var(--u))] min-[900px]:h-[calc(16*var(--u))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5l15-15m0 0H8.25m10.75 0v10.75" /></svg>
            </a>
            <a 
              href="/app/demo"
              className="hero-btn-secondary inline-flex items-center justify-center whitespace-nowrap flex-none font-bricolage font-[600] leading-none transition-transform hover:-translate-y-px"
              style={{ 
                height: 'calc(54*var(--u))', 
                padding: '0 calc(24*var(--u))', 
                gap: 'calc(8*var(--u))', 
                fontSize: 'calc(17*var(--u))', 
                border: 'calc(2*var(--u)) solid #0F1A17', 
                borderRadius: 'calc(4*var(--u))',
                background: '#F0A530',
                color: '#0F1A17',
                boxShadow: 'calc(4*var(--u)) calc(4*var(--u)) 0 #0F1A17'
              }}
              title="Open Hackathon Demo & Evaluator Controls"
            >
              Demo Mode ⚡
            </a>
          </div>

          {/* Trust Row */}
          <div className="trust" style={fi(540)}>
            <div className="bg-white flex items-center justify-center text-[#0F3D33] flex-none w-7 h-7 sm:w-8 sm:h-8 min-[900px]:w-[calc(38*var(--u))] min-[900px]:h-[calc(38*var(--u))] rounded-full border border-[#D9D5C7] text-xs min-[900px]:text-[calc(18*var(--u))]">👥</div>
            <div className="bg-white flex items-center justify-center text-[#0F3D33] flex-none w-7 h-7 sm:w-8 sm:h-8 min-[900px]:w-[calc(38*var(--u))] min-[900px]:h-[calc(38*var(--u))] rounded-full border border-[#D9D5C7] text-xs min-[900px]:text-[calc(18*var(--u))]">🛻</div>
            <div className="bg-white flex items-center justify-center text-[#0F3D33] flex-none w-7 h-7 sm:w-8 sm:h-8 min-[900px]:w-[calc(38*var(--u))] min-[900px]:h-[calc(38*var(--u))] rounded-full border border-[#D9D5C7] text-xs min-[900px]:text-[calc(18*var(--u))]">♻️</div>
            
            <div className="bg-[#D9D5C7] w-[1px] h-4 min-[900px]:w-[calc(1*var(--u))] min-[900px]:h-[calc(22*var(--u))] mx-1 sm:mx-2 min-[900px]:mx-[calc(10*var(--u))]" />
            <p className="font-sans text-[#5B6B64] text-[12px] sm:text-[13px] min-[900px]:text-[calc(13.5*var(--u))]">
              Built for households, kabadiwalas &amp; responsible recyclers
            </p>
          </div>
        </div>

        {/* ── RIGHT: Image Column ── */}
        <div className="hero-image" style={fi(200)}>
          <img
            src="/hero-ewaste.jpg"
            alt="Old smartphones and cables"
            className="w-full h-full object-cover block"
          />
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
          
          {/* Detected Device Card */}
          <div className="hero-floating-card bg-white flex flex-col justify-center">
            <div className="flex items-center gap-1.5 min-[900px]:gap-[calc(6*var(--u))] mb-1.5 min-[900px]:mb-[calc(12*var(--u))]">
              <div className="bg-[#3B8263] rounded-full w-1.5 h-1.5 min-[900px]:w-[calc(7*var(--u))] min-[900px]:h-[calc(7*var(--u))]" />
              <span className="font-spacemono text-[#5B6B64] text-[8px] sm:text-[9.5px] min-[900px]:text-[calc(10*var(--u))] tracking-wider">DEVICE DETECTED</span>
            </div>
            
            <div className="flex gap-2 min-[900px]:gap-[calc(16*var(--u))] items-center">
              <div className="bg-[#EEF0EA] flex items-center justify-center flex-shrink-0 relative overflow-hidden w-7 h-9 sm:w-8 sm:h-11 min-[900px]:w-[calc(66*var(--u))] min-[900px]:h-[calc(86*var(--u))] rounded min-[900px]:rounded-[calc(6*var(--u))]">
                <svg className="text-[#A9C2B8] w-4 h-6 min-[900px]:w-[calc(32*var(--u))] min-[900px]:h-[calc(48*var(--u))]" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="32" rx="3" />
                  <circle cx="12" cy="30" r="1.5" />
                </svg>
              </div>
              
              <div className="flex flex-col justify-center gap-0.5 min-[900px]:gap-[calc(6*var(--u))]">
                <div className="font-bricolage font-[700] text-[#0F1A17] leading-tight text-[10.5px] sm:text-[12.5px] min-[900px]:text-[calc(14*var(--u))]">
                  Smartphone &middot; 2019
                </div>
                <div className="flex items-center font-sans gap-1 min-[900px]:gap-[calc(8*var(--u))]">
                  <span className="text-[#5B6B64] text-[9px] sm:text-[10px] min-[900px]:text-[calc(11.5*var(--u))]">Condition:</span>
                  <span className="bg-[#CFE8C9] text-[#0F3D33] font-spacemono text-[8.5px] sm:text-[9.5px] min-[900px]:text-[calc(11*var(--u))] px-1 py-0.5 min-[900px]:px-[calc(6*var(--u))] min-[900px]:py-[calc(2*var(--u))] rounded min-[900px]:rounded-[calc(4*var(--u))]">repairable</span>
                </div>
                <div className="flex items-center font-sans gap-1 min-[900px]:gap-[calc(8*var(--u))]">
                  <span className="text-[#5B6B64] text-[9px] sm:text-[10px] min-[900px]:text-[calc(11.5*var(--u))]">Suggested path:</span>
                  <span className="bg-[#F6E3B4] text-[#6B4A00] font-spacemono font-bold text-[8.5px] sm:text-[9.5px] min-[900px]:text-[calc(11*var(--u))] px-1 py-0.5 min-[900px]:px-[calc(6*var(--u))] min-[900px]:py-[calc(2*var(--u))] rounded min-[900px]:rounded-[calc(4*var(--u))]">Refurbish ↗</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F4F1E8" strokeWidth="1.5" className="w-3.5 h-3.5 sm:w-4 sm:h-4 min-[900px]:w-[calc(22*var(--u))] min-[900px]:h-[calc(22*var(--u))] mb-0.5 min-[900px]:mb-[calc(4*var(--u))]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.5 0-8-3-8-9 0-3 2-6 5-8 1.5-1 3.5-2 6-2 0 4 .5 7-1.5 10-1.5 2.5-4 4-5.5 4l1 3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20c-3 0-5.5-2-5.5-6.5 0-2 1-4.5 3.5-6 1.5-1 4-1 6.5-.5" />
            </svg>
            <div className="font-spacemono text-center leading-[1.2] text-[7px] sm:text-[8.5px] min-[900px]:text-[calc(10.5*var(--u))] tracking-wider">KEEP IT<br/>IN USE</div>
          </div>

          {/* Sparkles */}
          <svg className="hero-sparkle-1 text-white z-10 opacity-85" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
          <svg className="hero-sparkle-2 text-white z-10 opacity-85" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>

          {/* Handwritten Note */}
          <div className="hero-note z-10 drop-shadow-md">
            same<br/>tech.<br/>brighter<br/>tomorrows.
          </div>
          <svg className="hero-arrow text-white drop-shadow-md z-10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 44 48">
            <path d="M 22,0 C 22,24 12,40 2,46 M 2,46 L 14,46 M 2,46 L 6,34" />
          </svg>
          
        </div>
      </div>
    </section>
  );
}
