import { useState } from 'react';

const LogoMark = () => (
  <svg
    className="w-[calc(52*var(--u))] h-[calc(52*var(--u))] flex-shrink-0"
    viewBox="0 0 52 52"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M26 4C13.85 4 4 13.85 4 26C4 38.15 13.85 48 26 48C38.15 48 48 38.15 48 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="16 8"/>
    <path d="M48 26L42 20M48 26L54 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M26 36C26 36 16 28 16 20C16 14.477 20.477 10 26 10C31.523 10 36 14.477 36 20C36 28 26 36 26 36Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M26 36V22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For households', href: '#for-households' },
  { label: 'For collectors', href: '#for-collectors' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Space+Mono:wght@400;700&display=swap');
        .font-bricolage { font-family: 'Bricolage Grotesque', sans-serif; }
        .font-spacemono { font-family: 'Space Mono', monospace; }
        .nav-btn-shadow { box-shadow: calc(3*var(--u)) calc(3*var(--u)) 0 #0B2B24; }
        .nav-btn-shadow:hover { box-shadow: calc(4*var(--u)) calc(4*var(--u)) 0 #0B2B24; }
        .navbar nav a, .navbar a { color: #F4F1E8 !important; }
        .btn-primary, .btn-primary * { color: #F4F1E8 !important; }
      `}</style>
      
      <header className="navbar relative z-[1000] h-[calc(78*var(--u))] flex-none bg-[var(--brand-green)] overflow-hidden w-full">
        <nav className="relative z-10 flex h-full items-center justify-between pl-[calc(132*var(--u))] pr-[calc(84*var(--u))] max-[900px]:px-6">
          
          <div className="flex items-center">
            <a href="/" className="flex items-center gap-[calc(10*var(--u))]" aria-label="Loopback home">
              <LogoMark />
              <span className="font-bricolage text-[calc(38*var(--u))] font-bold tracking-[-0.02em] leading-none">
                loopback
              </span>
            </a>

            <div className="hidden min-[900px]:flex items-center ml-[calc(28*var(--u))] gap-[calc(28*var(--u))]">
              <div className="w-[1px] h-[calc(40*var(--u))] bg-[#F4F1E8] opacity-35" />
              <div className="font-spacemono text-[calc(10*var(--u))] uppercase tracking-[0.18em] text-[#A9C2B8] leading-[1.35]">
                <div>E-WASTE</div>
                <div>INTELLIGENCE</div>
                <div>FOR A CLEANER TOMORROW</div>
              </div>
            </div>
          </div>

          <div className="hidden min-[900px]:flex items-center gap-[calc(42*var(--u))]">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="font-spacemono text-[calc(15*var(--u))] hover:text-[#F4623A] transition-colors decoration-[#F4623A] hover:underline underline-offset-4 decoration-2"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-[calc(16*var(--u))]">
            <a
              href="/app"
              className="btn-primary flex items-center gap-[calc(4*var(--u))] bg-[#F4623A] font-spacemono font-bold text-[calc(16*var(--u))] px-[calc(20*var(--u))] py-[calc(12*var(--u))] rounded-[calc(6*var(--u))] border-[calc(2*var(--u))] border-[#0F1A17] nav-btn-shadow transition-transform hover:-translate-y-px"
            >
              Scan an item ↗
            </a>

            <button
              className="min-[900px]:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 z-20"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span className="block w-6 h-[2px] bg-[#F4F1E8] transition-transform" style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span className="block w-6 h-[2px] bg-[#F4F1E8] transition-opacity" style={{ opacity: mobileOpen ? 0 : 1 }} />
              <span className="block w-6 h-[2px] bg-[#F4F1E8] transition-transform" style={{ transform: mobileOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none' }} />
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}
