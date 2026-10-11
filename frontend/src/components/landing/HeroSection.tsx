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
      className="hero w-full h-[calc(620*var(--u))] relative overflow-hidden bg-[#F4F1E8] max-[900px]:h-auto max-[900px]:min-h-0 max-[900px]:flex-auto"
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
        }
        @media(max-width: 899px) {
          .hero-inner {
            display: flex; flex-direction: column; padding: 24px 5vw; gap: 40px; background: transparent;
          }
          .hero-left { display: flex; flex-direction: column; min-width: 0; }
          .eyebrow { margin-bottom: 16px; font-size: 12px; }
          .hero-title { font-size: 44px; margin-bottom: 32px; white-space: normal; line-height: 1.1; }
          .hero-sub { font-size: 18px; margin-bottom: 24px; }
          .hero-cta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
          
          .hero-image { width: 100%; aspect-ratio: 816/521; border: 3px solid #0F1A17; box-shadow: 6px 6px 0 #F0522D; position: relative; }
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
            <div className="whitespace-nowrap max-[900px]:whitespace-normal">Your old tech</div>
            <div className="whitespace-nowrap max-[900px]:whitespace-normal">isn't the end.</div>
            <div className="whitespace-nowrap max-[900px]:whitespace-normal">It's the <span className="text-[#E8472A]">next</span></div>
            <div className="whitespace-nowrap max-[900px]:whitespace-normal">
              <span className="accent-word text-[#E8472A]">
                beginning.
                {/* Squiggle underline */}
                <svg
                  className="squiggle max-[900px]:hidden"
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
              className="inline-flex items-center justify-center whitespace-nowrap flex-none font-bricolage font-[600] leading-none transition-transform hover:-translate-y-px"
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
              Find its next life <svg className="w-[calc(16*var(--u))] h-[calc(16*var(--u))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5l15-15m0 0H8.25m10.75 0v10.75" /></svg>
            </a>
            <a 
              href="/app/demo"
              className="inline-flex items-center justify-center whitespace-nowrap flex-none font-bricolage font-[600] leading-none transition-transform hover:-translate-y-px"
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
            <div className="bg-white flex items-center justify-center text-[#0F3D33] flex-none" style={{ width: 'calc(38*var(--u))', height: 'calc(38*var(--u))', borderRadius: '50%', border: 'calc(1*var(--u)) solid #D9D5C7', fontSize: 'calc(18*var(--u))' }}>👥</div>
            <div className="bg-white flex items-center justify-center text-[#0F3D33] flex-none" style={{ width: 'calc(38*var(--u))', height: 'calc(38*var(--u))', borderRadius: '50%', border: 'calc(1*var(--u)) solid #D9D5C7', fontSize: 'calc(18*var(--u))' }}>🛻</div>
            <div className="bg-white flex items-center justify-center text-[#0F3D33] flex-none" style={{ width: 'calc(38*var(--u))', height: 'calc(38*var(--u))', borderRadius: '50%', border: 'calc(1*var(--u)) solid #D9D5C7', fontSize: 'calc(18*var(--u))' }}>♻️</div>
            
            <div className="bg-[#D9D5C7]" style={{ width: 'calc(1*var(--u))', height: 'calc(22*var(--u))', margin: '0 calc(10*var(--u))' }} />
            <p className="font-sans text-[#5B6B64] max-[900px]:whitespace-normal" style={{ fontSize: 'calc(13.5*var(--u))' }}>
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
          
          {/* Card */}
          <div 
            className="absolute bg-white flex flex-col justify-center"
            style={{ 
              left: 'calc(74*var(--u))', top: 'calc(54*var(--u))', width: 'calc(335*var(--u))', height: 'calc(147*var(--u))', 
              borderRadius: 'calc(8*var(--u))', padding: 'calc(16*var(--u))',
              boxShadow: '0 calc(8*var(--u)) calc(24*var(--u)) rgba(0,0,0,0.12)' 
            }}
          >
            <div className="flex items-center gap-[calc(6*var(--u))] mb-[calc(12*var(--u))]">
              <div className="bg-[#3B8263] rounded-full" style={{ width: 'calc(7*var(--u))', height: 'calc(7*var(--u))' }} />
              <span className="font-spacemono text-[#5B6B64]" style={{ fontSize: 'calc(10*var(--u))', letterSpacing: '0.15em' }}>DEVICE DETECTED</span>
            </div>
            
            <div className="flex" style={{ gap: 'calc(16*var(--u))' }}>
              <div className="bg-[#EEF0EA] flex items-center justify-center flex-shrink-0 relative overflow-hidden" style={{ width: 'calc(66*var(--u))', height: 'calc(86*var(--u))', borderRadius: 'calc(6*var(--u))' }}>
                <svg className="text-[#A9C2B8]" style={{ width: 'calc(32*var(--u))', height: 'calc(48*var(--u))' }} viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="32" rx="3" />
                  <path d="M4 10 L20 22" strokeDasharray="2 2" />
                  <circle cx="12" cy="30" r="1.5" />
                </svg>
              </div>
              
              <div className="flex flex-col justify-center" style={{ gap: 'calc(6*var(--u))' }}>
                <div className="font-bricolage font-[700] text-[#0F1A17] leading-tight" style={{ fontSize: 'calc(14*var(--u))' }}>
                  Smartphone &middot; 2019
                </div>
                <div className="flex items-center font-sans" style={{ gap: 'calc(8*var(--u))' }}>
                  <span className="text-[#5B6B64]" style={{ fontSize: 'calc(11.5*var(--u))' }}>Condition:</span>
                  <span className="bg-[#CFE8C9] text-[#0F3D33] font-spacemono" style={{ fontSize: 'calc(11*var(--u))', padding: 'calc(2*var(--u)) calc(6*var(--u))', borderRadius: 'calc(4*var(--u))' }}>repairable</span>
                </div>
                <div className="flex items-center font-sans" style={{ gap: 'calc(8*var(--u))' }}>
                  <span className="text-[#5B6B64]" style={{ fontSize: 'calc(11.5*var(--u))' }}>Suggested path:</span>
                  <span className="bg-[#F6E3B4] text-[#6B4A00] font-spacemono font-bold" style={{ fontSize: 'calc(11*var(--u))', padding: 'calc(2*var(--u)) calc(6*var(--u))', borderRadius: 'calc(4*var(--u))' }}>Refurbish ↗</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div 
            className="absolute bg-[#0F3D33] flex flex-col items-center justify-center text-[#F4F1E8]"
            style={{ 
              right: 'calc(50*var(--u))', top: 'calc(24*var(--u))', width: 'calc(98*var(--u))', height: 'calc(98*var(--u))', borderRadius: '50%',
              boxShadow: 'inset 0 0 0 calc(4*var(--u)) #0F3D33, inset 0 0 0 calc(6*var(--u)) #F4F1E8' 
            }}
          >
            <svg style={{ width: 'calc(22*var(--u))', height: 'calc(22*var(--u))' }} viewBox="0 0 24 24" fill="none" stroke="#F4F1E8" strokeWidth="1.5" className="mb-[calc(4*var(--u))]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.5 0-8-3-8-9 0-3 2-6 5-8 1.5-1 3.5-2 6-2 0 4 .5 7-1.5 10-1.5 2.5-4 4-5.5 4l1 3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20c-3 0-5.5-2-5.5-6.5 0-2 1-4.5 3.5-6 1.5-1 4-1 6.5-.5" />
            </svg>
            <div className="font-spacemono text-center" style={{ fontSize: 'calc(10.5*var(--u))', letterSpacing: '0.12em', lineHeight: '1.2' }}>KEEP IT<br/>IN USE</div>
          </div>

          {/* Sparkles */}
          <svg className="absolute text-white z-10 opacity-85" style={{ left: 'calc(540*var(--u))', top: 'calc(40*var(--u))', width: 'calc(24*var(--u))', height: 'calc(24*var(--u))', transform: 'rotate(-55deg)', strokeWidth: 'calc(2*var(--u))' }} viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
          <svg className="absolute text-white z-10 opacity-85" style={{ left: 'calc(555*var(--u))', top: 'calc(65*var(--u))', width: 'calc(18*var(--u))', height: 'calc(18*var(--u))', transform: 'rotate(-20deg)', strokeWidth: 'calc(2*var(--u))' }} viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>

          {/* Handwritten Note */}
          <div className="absolute font-caveat text-white text-left z-10 drop-shadow-md leading-[1.15]" style={{ left: 'calc(690*var(--u))', top: 'calc(192*var(--u))', width: 'calc(96*var(--u))', fontSize: 'calc(22*var(--u))', transform: 'rotate(-12deg)' }}>
            same<br/>tech.<br/>brighter<br/>tomorrows.
          </div>
          <svg className="absolute text-white drop-shadow-md z-10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 44 48" style={{ left: 'calc(724*var(--u))', top: 'calc(300*var(--u))', width: 'calc(44*var(--u))', height: 'calc(48*var(--u))', strokeWidth: 'calc(2.5*var(--u))' }}>
            <path d="M 22,0 C 22,24 12,40 2,46 M 2,46 L 14,46 M 2,46 L 6,34" />
          </svg>
          
        </div>
      </div>
    </section>
  );
}
