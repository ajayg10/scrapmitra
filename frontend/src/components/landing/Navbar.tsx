import { useState } from 'react';

const LogoMark = () => (
  <svg
    className="w-[calc(52*var(--u))] h-[calc(52*var(--u))] max-[767px]:w-8 max-[767px]:h-8 flex-shrink-0"
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
        @media(max-width: 767px) {
          .nav-btn-shadow { box-shadow: 2px 2px 0 #0B2B24; }
          .nav-btn-shadow:hover { box-shadow: 3px 3px 0 #0B2B24; }
        }
      `}</style>
      
      <header className="navbar relative z-[1000] h-[calc(78*var(--u))] max-[767px]:h-16 flex-none bg-[var(--brand-green)] w-full">
        <nav className="relative z-10 flex h-full items-center justify-between pl-[calc(132*var(--u))] pr-[calc(84*var(--u))] max-[767px]:px-4">
          
          <div className="flex items-center">
            <a href="/" className="flex items-center gap-[calc(10*var(--u))] max-[767px]:gap-2" aria-label="ScrapMitra home">
              <LogoMark />
              <span className="font-bricolage text-[calc(38*var(--u))] max-[767px]:text-[22px] font-bold tracking-[-0.02em] leading-none text-[#F4F1E8]">
                scrapmitra
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

          <div className="flex items-center gap-[calc(12*var(--u))] max-[767px]:gap-2">
            <a
              href="/app/demo"
              className="hidden sm:inline-flex items-center gap-[calc(4*var(--u))] bg-[#0F3D33] text-[#F4F1E8] font-spacemono font-bold text-[calc(14*var(--u))] max-[767px]:text-xs px-[calc(14*var(--u))] py-[calc(10*var(--u))] max-[767px]:px-2.5 max-[767px]:py-1.5 rounded-[calc(6*var(--u))] max-[767px]:rounded-md border-[calc(2*var(--u))] max-[767px]:border-2 border-[#0F1A17] transition-transform hover:-translate-y-px"
              title="Hackathon Evaluation & Demo Mode"
            >
              Demo
            </a>
            <a
              href="/app"
              className="btn-primary flex items-center gap-[calc(4*var(--u))] bg-[#F4623A] font-spacemono font-bold text-[calc(16*var(--u))] max-[767px]:text-[13px] px-[calc(20*var(--u))] py-[calc(12*var(--u))] max-[767px]:px-3 max-[767px]:py-1.5 rounded-[calc(6*var(--u))] max-[767px]:rounded-md border-[calc(2*var(--u))] max-[767px]:border-2 border-[#0F1A17] nav-btn-shadow transition-transform hover:-translate-y-px"
            >
              Scan an item ↗
            </a>

            <button
              className="min-[900px]:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 z-20 text-[#F4F1E8]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <span className="block w-6 h-[2px] bg-[#F4F1E8] transition-transform duration-200" style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span className="block w-6 h-[2px] bg-[#F4F1E8] transition-opacity duration-200" style={{ opacity: mobileOpen ? 0 : 1 }} />
              <span className="block w-6 h-[2px] bg-[#F4F1E8] transition-transform duration-200" style={{ transform: mobileOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none' }} />
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div className="min-[900px]:hidden absolute top-full left-0 right-0 bg-[#0F3D33] border-b-2 border-[#0B2B24] shadow-xl px-5 py-4 flex flex-col gap-3 z-[999]">
            <div className="flex flex-col gap-2.5">
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-spacemono text-[14px] text-[#F4F1E8] hover:text-[#F4623A] py-1.5 border-b border-[#F4F1E8]/10 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="pt-1.5 flex items-center justify-between text-[#A9C2B8] font-spacemono text-[11px] tracking-wider uppercase">
              <a href="/app/demo" onClick={() => setMobileOpen(false)} className="text-[#F0A530] font-bold">
                Demo Mode ⚡
              </a>
              <a href="/app" onClick={() => setMobileOpen(false)} className="text-[#F4623A] font-bold">
                Open App →
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
