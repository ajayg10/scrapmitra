import LogoMark from './ui/LogoMark';

const PLATFORM_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Scan an item', href: '/app' },
  { label: 'Find a collection', href: '#for-collectors' },
  { label: 'Our approach', href: '#our-approach' },
];

const IN_THE_LOOP_LINKS = [
  { label: 'For households', href: '#for-households' },
  { label: 'For collectors', href: '#for-collectors' },
  { label: 'For repairers', href: '#for-repairers' },
  { label: 'For recyclers', href: '#for-recyclers' },
];

const RESOURCE_LINKS = [
  { label: 'Device safety', href: '#how-it-works' },
  { label: 'Data privacy', href: '#data-privacy' },
  { label: 'Responsible recycling', href: '#for-recyclers' },
  { label: 'Contact us', href: 'mailto:contact@scrapmitra.org' },
];

function handleFooterLink(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (href.startsWith('#')) {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

export default function Footer() {
  return (
    <footer className="relative bg-[#0B2923] overflow-hidden pt-10 md:pt-14 pb-7 md:pb-8 text-[#F6F3E9]">
      <style>{`
        .lb-footer-texture::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(168,189,165,0.08) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
        }
        .lb-footer-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: fit-content;
        }
        .lb-footer-nav-link:hover .lb-nav-arrow {
          transform: translateX(4px);
          color: #F15B40;
          opacity: 1;
        }
        .lb-footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 520px) and (max-width: 849px) {
          .lb-footer-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.75rem;
            margin-bottom: 2.25rem;
          }
        }
        @media (min-width: 850px) {
          .lb-footer-grid {
            grid-template-columns: 2.2fr 1fr 1fr 1.1fr;
            gap: clamp(1.5rem, 3vw, 3rem);
            margin-bottom: 2.25rem;
          }
        }
      `}</style>

      {/* Background dot texture */}
      <div className="lb-footer-texture" />

      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12 lg:px-16 flex flex-col">
        
        {/* ── TOP SECTION: Four-column layout ── */}
        <div className="lb-footer-grid">
          
          {/* Column 1 — Brand */}
          <div className="flex flex-col items-start pr-0 lg:pr-6">
            <a
              href="/"
              className="flex items-center gap-3 mb-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15B40] rounded-md transition-opacity hover:opacity-90"
              aria-label="ScrapMitra home"
            >
              <div className="bg-[#123C32] p-2 rounded-[10px] flex items-center justify-center relative shadow-sm border border-[#A8BDA5]/20">
                <LogoMark size={22} color="#F6F3E9" />
                {/* Coral accent dot */}
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#F15B40] rounded-full border-2 border-[#0B2923]" />
              </div>
              <span className="font-['Space_Grotesk'] text-[26px] md:text-[28px] font-bold text-[#F6F3E9] tracking-[-0.03em] leading-none">
                scrapmitra
              </span>
            </a>
            
            <p className="font-['Space_Grotesk'] text-[15px] md:text-[16px] font-semibold text-[#F6F3E9] mb-1.5 max-w-[400px] leading-[1.35]">
              Intelligence for your old tech. Possibility for what comes next.
            </p>
            
            <p className="font-['Plus_Jakarta_Sans'] text-[13px] md:text-[14px] text-[#A8BDA5] max-w-[400px] leading-relaxed mb-3">
              Helping people find better next steps for discarded electronics.
            </p>
          </div>

          {/* Column 2 — PLATFORM */}
          <div className="flex flex-col">
            <h4 className="font-['IBM_Plex_Mono'] text-[11px] text-[#A8BDA5] mb-3.5 uppercase tracking-[1.5px] font-semibold">
              Platform
            </h4>
            <nav className="flex flex-col gap-2.5" aria-label="Platform navigation">
              {PLATFORM_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={e => handleFooterLink(e, link.href)}
                  className="lb-footer-nav-link text-[14px] md:text-[15px] font-['Plus_Jakarta_Sans'] font-medium text-[#D7E3D2] hover:text-[#F6F3E9] transition-colors"
                >
                  <span>{link.label}</span>
                  <svg 
                    className="lb-nav-arrow w-3.5 h-3.5 ml-1 opacity-0 -translate-x-2 transition-all duration-200" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              ))}
            </nav>
          </div>

          {/* Column 3 — IN THE LOOP */}
          <div className="flex flex-col">
            <h4 className="font-['IBM_Plex_Mono'] text-[11px] text-[#A8BDA5] mb-3.5 uppercase tracking-[1.5px] font-semibold">
              In The Loop
            </h4>
            <nav className="flex flex-col gap-2.5" aria-label="In the loop navigation">
              {IN_THE_LOOP_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={e => handleFooterLink(e, link.href)}
                  className="lb-footer-nav-link text-[14px] md:text-[15px] font-['Plus_Jakarta_Sans'] font-medium text-[#D7E3D2] hover:text-[#F6F3E9] transition-colors"
                >
                  <span>{link.label}</span>
                  <svg 
                    className="lb-nav-arrow w-3.5 h-3.5 ml-1 opacity-0 -translate-x-2 transition-all duration-200" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              ))}
            </nav>
          </div>

          {/* Column 4 — RESOURCES */}
          <div className="flex flex-col">
            <h4 className="font-['IBM_Plex_Mono'] text-[11px] text-[#A8BDA5] mb-3.5 uppercase tracking-[1.5px] font-semibold">
              Resources
            </h4>
            <nav className="flex flex-col gap-2.5" aria-label="Resources navigation">
              {RESOURCE_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={e => handleFooterLink(e, link.href)}
                  className="lb-footer-nav-link text-[14px] md:text-[15px] font-['Plus_Jakarta_Sans'] font-medium text-[#D7E3D2] hover:text-[#F6F3E9] transition-colors"
                >
                  <span>{link.label}</span>
                  <svg 
                    className="lb-nav-arrow w-3.5 h-3.5 ml-1 opacity-0 -translate-x-2 transition-all duration-200" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              ))}
            </nav>
          </div>

        </div>

        {/* ── THIN HORIZONTAL DIVIDER ── */}
        <div className="w-full h-[1px] bg-[#A8BDA5] opacity-20 mb-6 md:mb-8" />

        {/* ── SIGNATURE HEADLINE ── */}
        <div className="mb-6 md:mb-8">
          <h2 className="font-['Space_Grotesk'] text-[32px] sm:text-[44px] md:text-[54px] lg:text-[62px] font-bold text-[#F6F3E9] tracking-[-0.035em] leading-[1.05] select-none">
            Keep it in the loop.
          </h2>
        </div>

        {/* ── BOTTOM METADATA ROW ── */}
        <div className="pt-5 md:pt-6 border-t border-[#A8BDA5]/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[11px] md:text-[12px] font-['IBM_Plex_Mono'] text-[#A8BDA5] tracking-[0.5px]">
          
          {/* Left: Copyright */}
          <p className="m-0 uppercase">
            © 2026 SCRAPMITRA · A NEXT BEGINNING, NOT A DEAD END.
          </p>

          {/* Right: Legal & Accessibility Links */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="hover:text-[#F6F3E9] transition-colors cursor-default">Privacy</span>
            <span className="text-[#A8BDA5]/40" aria-hidden="true">·</span>
            <span className="hover:text-[#F6F3E9] transition-colors cursor-default">Terms</span>
            <span className="text-[#A8BDA5]/40" aria-hidden="true">·</span>
            <span className="hover:text-[#F6F3E9] transition-colors cursor-default">Accessibility</span>
          </div>

        </div>

      </div>
    </footer>
  );
}
