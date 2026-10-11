import LogoMark from './ui/LogoMark';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For households', href: '#for-households' },
  { label: 'For collectors', href: '#for-collectors' },
  { label: 'Scan an item', href: '/app' },
];

function handleFooterLink(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (href.startsWith('#')) {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  }
}

export default function Footer() {
  return (
    <footer className="relative bg-[#0B2923] overflow-hidden py-16 md:py-24">
      <style>{`
        .lb-footer-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(168,189,165,0.07) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
        }
        .lb-footer-nav-link:hover .lb-nav-arrow {
          transform: translateX(6px);
          color: #F15B40;
          opacity: 1;
        }
        .lb-footer-nav-link:focus-visible {
          outline: 2px solid #F15B40;
          outline-offset: 6px;
          border-radius: 4px;
        }
      `}</style>

      <div className="lb-footer-bg" />

      {/* Environmental detail */}
      <div 
        className="absolute bottom-0 right-0 w-full max-w-[600px] h-[350px] pointer-events-none z-0 hidden md:block"
        style={{
          backgroundImage: 'url(/images/trees-left.png?v=3)',
          backgroundSize: 'contain',
          backgroundPosition: 'right bottom',
          backgroundRepeat: 'no-repeat',
          filter: 'invert(1)',
          opacity: 0.05,
          transform: 'scaleX(-1)'
        }}
      />

      <div className="lb-container relative z-10 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-20">
          
          {/* Brand Area */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col items-start">
            <a href="/" className="flex items-center gap-3 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15B40] rounded-md transition-opacity hover:opacity-90" aria-label="Loopback home">
              <div className="bg-[#123C32] p-2.5 rounded-[12px] flex items-center justify-center relative shadow-sm">
                <LogoMark size={24} color="#F6F3E9" />
                {/* Coral accent dot */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F15B40] rounded-full border-2 border-[#0B2923]" />
              </div>
              <span className="font-['Space_Grotesk'] text-[32px] font-bold text-[#F6F3E9] tracking-[-0.02em] leading-none">
                loopback
              </span>
            </a>
            
            <h3 className="font-['Space_Grotesk'] text-[20px] md:text-[22px] font-bold text-[#F6F3E9] mb-4 max-w-[420px] leading-[1.3]">
              E-waste intelligence for a cleaner tomorrow.
            </h3>
            
            <p className="font-['Plus_Jakarta_Sans'] text-[16px] text-[#A8BDA5] max-w-[460px] leading-relaxed">
              Helping households, collectors, and recyclers find appropriate next steps for discarded electronics.
            </p>
          </div>

          {/* Navigation Area */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col">
            <h4 className="font-['IBM_Plex_Mono'] text-[12px] text-[#A8BDA5] mb-6 uppercase tracking-[1.5px] font-semibold">
              Navigate
            </h4>
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={e => handleFooterLink(e, link.href)}
                  className="lb-footer-nav-link group flex items-center text-[16px] font-['Plus_Jakarta_Sans'] font-medium text-[#D7E3D2] hover:text-[#F6F3E9] transition-colors w-fit"
                >
                  {link.label}
                  <svg 
                    className="lb-nav-arrow w-4 h-4 ml-1 opacity-0 -translate-x-3 transition-all duration-300" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              ))}
            </nav>
          </div>

        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-[#A8BDA5] opacity-20 mb-8" />

        {/* Bottom copyright row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="font-['Plus_Jakarta_Sans'] text-[14px] text-[#A8BDA5]">
            Give old tech a better next step.
          </p>
          <p className="font-['Plus_Jakarta_Sans'] text-[14px] text-[#D7E3D2] font-medium">
            © {new Date().getFullYear()} Loopback · E-waste intelligence
          </p>
        </div>
        
      </div>
    </footer>
  );
}
