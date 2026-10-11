import AnimatedSection from './ui/AnimatedSection';
import Eyebrow from './ui/Eyebrow';
import { usePrefersReducedMotion } from './hooks';

/* ── Data ─────────────────────────────────────────────── */
const PARTICIPANTS = [
  {
    id: 'households',
    label: 'Households',
    desc: 'Identify and list devices ready for assessment or collection.',
    img: '/images/connect/connect-household.jpg',
    pos: 'tl',
  },
  {
    id: 'collectors',
    label: 'Local collectors',
    desc: 'Kabadiwalas who can pick up and sort materials at source.',
    img: '/images/connect/connect-collector-truck.jpg',
    pos: 'tr',
  },
  {
    id: 'recyclers',
    label: 'Authorised recyclers',
    desc: 'Process non-recoverable materials through certified facilities.',
    img: '/images/connect/connect-authorised-recycling.jpg',
    pos: 'bl',
  },
  {
    id: 'repairers',
    label: 'Repair shops & refurbishers',
    desc: 'Assess, fix, and refurbish devices for extended use.',
    img: '/images/connect/connect-repair-workbench.jpg',
    pos: 'br',
  },
];

/* ── Center SVG Network Hub ───────────────────────────── */
function NetworkHub() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block" style={{ width: '440px', height: '440px', zIndex: 0 }}>
      <svg viewBox="0 0 440 440" className="w-full h-full text-[#123C32]">

        {/* Outer dashed ring */}
        <circle cx="220" cy="220" r="100" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />
        {/* Inner concentric rings */}
        <circle cx="220" cy="220" r="80" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="220" cy="220" r="60" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />

        {/* Core Hub */}
        <circle cx="220" cy="220" r="40" fill="#071C17" stroke="currentColor" strokeWidth="2" />

        {/* Location Pin inside Hub */}
        <g stroke="#F6F3E9" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(208, 206) scale(1.1)">
          <path d="M11 19C11 19 2 13 2 7a9 9 0 0 1 18 0c0 6-9 12-9 12z" />
          <circle cx="11" cy="7" r="3" />
        </g>

        {/* Connecting Arrows (Radius 150) */}
        <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4">
          {/* TL Arc */}
          <path d="M 95 185 A 150 150 0 0 1 185 95" />
          <polygon points="185,95 175,97 180,103" fill="currentColor" stroke="none" />
          <polygon points="95,185 97,175 103,180" fill="currentColor" stroke="none" />

          {/* TR Arc */}
          <path d="M 255 95 A 150 150 0 0 1 345 185" />
          <polygon points="255,95 265,97 260,103" fill="currentColor" stroke="none" />
          <polygon points="345,185 343,175 337,180" fill="currentColor" stroke="none" />

          {/* BR Arc */}
          <path d="M 345 255 A 150 150 0 0 1 255 345" />
          <polygon points="345,255 343,265 337,260" fill="currentColor" stroke="none" />
          <polygon points="255,345 265,343 260,337" fill="currentColor" stroke="none" />

          {/* BL Arc */}
          <path d="M 185 345 A 150 150 0 0 1 95 255" />
          <polygon points="185,345 175,343 180,337" fill="currentColor" stroke="none" />
          <polygon points="95,255 97,265 103,260" fill="currentColor" stroke="none" />
        </g>

        {/* Orange Badges */}
        {/* Top */}
        <circle cx="220" cy="70" r="14" fill="#E8573A" />
        <path d="M216 66l4 4-4 4" stroke="#F6F3E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Bottom */}
        <circle cx="220" cy="370" r="14" fill="#E8573A" />
        <path d="M216 366l4 4-4 4" stroke="#F6F3E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Left */}
        <circle cx="70" cy="220" r="14" fill="#E8573A" />
        <path d="M67 217l3-3 3 3m-3-3v6m0 3v1" stroke="#F6F3E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Right */}
        <circle cx="370" cy="220" r="14" fill="#E8573A" />
        <path d="M367 217l3-3 3 3m-3-3v6m0 3v1" stroke="#F6F3E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

/* ── Banner Icon ──────────────────────────────────────── */
function BannerIcon() {
  return (
    <div className="flex justify-center items-center mb-5 relative w-full max-w-[800px] mx-auto">
      {/* Left Line (dot at the OUTER end) */}
      <div className="h-[1px] bg-[#F6F3E9] opacity-35 relative" style={{ width: 'clamp(80px, 20vw, 240px)' }}>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#F6F3E9]" />
      </div>

      {/* Orbit Motif: 140px box, ring is 120px wide (radius 60px) centred in it */}
      <div className="relative w-[140px] h-[140px] mx-6 flex items-center justify-center flex-shrink-0" id="ce-banner-orbit">
        <style>{`
          @media (max-width: 768px) {
            #ce-banner-orbit { transform: scale(0.7); margin: 0; }
          }
        `}</style>

        {/* Outer Ring */}
        <div className="absolute inset-0 m-[10px] rounded-full border border-[#F6F3E9] opacity-35" />

        {/* Inner Dotted Ring (FIX: was an invalid `borderDasharray` style, so it never rendered dotted) */}
        <div className="absolute inset-0 m-[50px] rounded-full border border-dotted border-[#F6F3E9] opacity-50" />

        {/* Center pin */}
        <svg className="w-8 h-8 text-[#F6F3E9] opacity-90 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>

        {/* Top badge: LEAF (FIX: was a check mark) */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28px] h-[28px] bg-[#F6F3E9] rounded-full flex items-center justify-center text-[#123C32]">
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>

        {/* Bottom-left badge: WRENCH (FIX: moved onto the ring, was ~10px outside it) */}
        <div className="absolute bottom-[28px] left-[28px] -translate-x-1/2 translate-y-1/2 w-[28px] h-[28px] bg-[#F6F3E9] rounded-full flex items-center justify-center text-[#123C32]">
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        {/* Bottom-right badge: RECYCLE (FIX: moved onto the ring) */}
        <div className="absolute bottom-[28px] right-[28px] translate-x-1/2 translate-y-1/2 w-[28px] h-[28px] bg-[#F6F3E9] rounded-full flex items-center justify-center text-[#123C32]">
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </div>

        {/* Orange dots on the ring.
            FIX: the old 5 and 7 o'clock dots sat underneath the bottom badges, so they are
            replaced by one dot between the badges at the bottom of the ring. */}
        {/* 10 o'clock (larger) */}
        <div className="absolute top-[36px] left-[14px] w-[8px] h-[8px] bg-[#E8573A] rounded-full" />
        {/* 2 o'clock */}
        <div className="absolute top-[37px] right-[16px] w-[5px] h-[5px] bg-[#E8573A] rounded-full" />
        {/* Bottom centre, between the two badges */}
        <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] bg-[#E8573A] rounded-full" />
      </div>

      {/* Right Line (dot at the OUTER end) */}
      <div className="h-[1px] bg-[#F6F3E9] opacity-35 relative" style={{ width: 'clamp(80px, 20vw, 240px)' }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#F6F3E9]" />
      </div>
    </div>
  );
}


/* ── Main Component ───────────────────────────────────── */
export default function CircularEconomySection() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="for-households" className="ce-section" aria-labelledby="ce-heading">
      <div id="for-collectors" className="sr-only" />
      <style>{`
        .ce-section {
          background: #F6F3E9;
          position: relative;
          overflow-x: clip; /* Prevent overflow scrolling from breakout images */
          padding: 80px 0 0 0;
        }

        .ce-dot-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(18,60,50,0.07) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
        }

        /* ── Top block: everything above the banner ──
           This wrapper ends exactly where the banner begins, so the landscape can be
           anchored to its bottom edge. Its bottom padding is the gap above the banner. */
        .ce-top {
          position: relative;
          padding-bottom: clamp(40px, 5vw, 64px);
        }

        /* ── Landscape Background (behind cards) ── */
        .ce-bg-landscape {
          /* The artwork has blank space along its bottom edge. --ce-art-sink pushes the art down
             by that amount, and clip-path cuts anything below the banner's top edge, so the
             visible mountains end exactly where the banner starts.
             Tune only this one value: raise it if a gap remains, lower it if too much is cut. */
          --ce-art-sink: 32px;
          position: absolute;
          bottom: calc(var(--ce-art-sink) * -1);
          clip-path: inset(0 0 var(--ce-art-sink) 0);
          left: 0;
          width: 100%;
          height: 340px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.12;
          mix-blend-mode: multiply;
          filter: grayscale(100%) sepia(20%) hue-rotate(90deg);
        }
        .ce-bg-art {
          position: absolute;
          bottom: 0;
          height: 100%;
          width: auto;
          max-width: 45vw;
          object-fit: contain;
          /* Feather the top, the inner side and a sliver of the bottom so no rectangle shows.
             The mask flips together with scaleX(-1), so the right copy needs no extra rule. */
          -webkit-mask-image:
            linear-gradient(to bottom, transparent 0%, #000 30%),
            linear-gradient(to right, #000 55%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-image:
            linear-gradient(to bottom, transparent 0%, #000 30%),
            linear-gradient(to right, #000 55%, transparent 100%);
          mask-composite: intersect;
        }
        .ce-bg-left { left: 0; }
        .ce-bg-right { right: 0; transform: scaleX(-1); }

        .ce-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2.5rem);
          position: relative;
          z-index: 2;
        }

        /* ── Header ────────────────────────────── */
        .ce-header {
          text-align: center;
          margin-bottom: clamp(2.5rem, 5vw, 4rem);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ce-h2 {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: clamp(2rem, 3.5vw, 2.6rem);
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #172722;
          line-height: 1.1;
          margin: 14px 0 16px; /* space below the eyebrow and above the subtext */
          text-wrap: balance;
        }
        .ce-sub {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: clamp(1rem, 1.1vw, 1.1rem);
          color: #66766E;
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.6;
          text-wrap: balance; /* two evenly sized lines, no orphan word */
        }

        /* ── Ecosystem Grid ────────────────────── */
        .ce-ecosystem {
          position: relative;
          display: grid;
          grid-template-areas:
            "tl center tr"
            "bl center br";
          grid-template-columns: 1fr 140px 1fr;
          grid-template-rows: auto auto;
          gap: clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem);
          align-items: center;
          padding-left: 20px; /* Room for breakout images on the left */
        }

        .ce-hub-wrapper {
          grid-area: center;
          grid-row: 1 / 3;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ce-card-tl { grid-area: tl; }
        .ce-card-tr { grid-area: tr; }
        .ce-card-bl { grid-area: bl; }
        .ce-card-br { grid-area: br; }

        /* ── Cards ─────────────────────────────── */
        .ce-card {
          position: relative;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(168, 189, 165, 0.45);
          border-radius: 14px;
          padding: 20px 24px 20px 134px; /* Left padding = image left (12) + image width (108) + ~14 gap */
          box-shadow: 0 4px 12px rgba(11,41,35,0.02);
          min-height: 124px;
          display: flex;
          align-items: center;
          z-index: 2;
        }

        .ce-card-img {
          position: absolute;
          left: 12px; /* fully inside the card */
          top: 50%;
          transform: translateY(-50%); /* vertically centred on the card */
          width: 108px;
          height: 108px;
          object-fit: contain;
          /* FIX: multiply can't reach the page through the card's stacking context, so the JPG's
             cream background showed as a box. This filter (defined in the JSX) turns the light
             background transparent and keeps the line art. */
          filter: url(#ce-knockout);
          pointer-events: none;
        }

        .ce-card-text {
          text-align: left;
        }
        .ce-card-title {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #123C32;
          margin: 0 0 4px;
        }
        .ce-card-desc {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #66766E;
          margin: 0;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Inset Dark Banner ─────────────────── */
        .ce-banner-container {
          padding: 0 40px 24px;
          /* No margin-top: the gap above the banner now comes from .ce-top's padding-bottom */
          position: relative;
          z-index: 2;
        }
        .ce-banner {
          background: #0B2923;
          max-width: 1200px;
          margin: 0 auto;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          padding: 32px 24px 40px;
          text-align: center;
        }
        .ce-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(168,189,165,0.07) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        .ce-banner-art {
          position: absolute;
          bottom: 0;
          height: 72%;
          width: auto;
          max-width: 40%;
          object-fit: contain;
          object-position: left bottom;
          opacity: 0.6;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          mix-blend-mode: lighten;
          -webkit-mask-image: linear-gradient(to top, #000 60%, transparent 100%), linear-gradient(to right, #000 55%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-image: linear-gradient(to top, #000 60%, transparent 100%), linear-gradient(to right, #000 55%, transparent 100%);
          mask-composite: intersect;
        }
        .ce-banner-left { left: 0; }
        .ce-banner-right { right: 0; transform: scaleX(-1); }

        .ce-banner-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center; /* centers every child, whatever margins it has */
          text-align: center;
        }
        /* Extra specificity (.ce-banner .ce-banner-h2) so no global h2 rule can shift it */
        .ce-banner .ce-banner-h2 {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: clamp(22px, 2.1vw, 32px);
          font-weight: 700;
          color: #F6F3E9;
          line-height: 1.25;
          margin: 0 auto 16px;
          padding: 0;
          width: 100%;
          max-width: 29em; /* wide enough that line 1 ends at "helps" */
          text-align: center;
          transform: none;
        }
        .ce-banner .ce-banner-sub {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 15px;
          color: rgba(246, 243, 233, 0.6);
          margin: 0 auto;
          text-align: center;
        }

        /* ── Responsive ────────────────────────── */
        @media (max-width: 768px) {
          .ce-banner-container {
            padding: 0 16px 24px;
          }
          .ce-banner-art {
            height: 45%;
            opacity: 0.3;
          }
        }

        @media (max-width: 900px) {
          .ce-ecosystem {
            grid-template-areas:
              "center"
              "tl"
              "tr"
              "bl"
              "br";
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            gap: 1.5rem;
            padding-left: 10px;
          }
          .ce-hub-wrapper {
            grid-row: auto;
            padding: 10px 0 20px;
          }
        }
      `}</style>

      {/* Filter used by .ce-card-img: turns the light JPG background transparent (luminance -> alpha) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        {/* Region = exactly the image box (no bleed). The final feComposite multiplies the result by the
            ORIGINAL alpha, so anything outside the picture stays fully transparent (no black box). */}
        <filter id="ce-knockout" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    -0.478 -0.939 -0.182 0 1.46"
            result="keyed"
          />
          <feComponentTransfer in="keyed" result="crushed">
            <feFuncA type="linear" slope="1.25" intercept="-0.05" />
          </feComponentTransfer>
          <feComposite in="crushed" in2="SourceAlpha" operator="in" />
        </filter>
      </svg>

      <div className="ce-dot-grid" />

      {/* Everything above the banner. The landscape is anchored to the bottom of this block. */}
      <div className="ce-top">
        {/* Landscape sketch (behind cards) */}
        <div className="ce-bg-landscape hidden md:block">
          <img src="/images/mountains-left.png" alt="" className="ce-bg-art ce-bg-left" />
          <img src="/images/mountains-left.png" alt="" className="ce-bg-art ce-bg-right" />
        </div>

        <div className="ce-container">
          {/* Header */}
          <AnimatedSection>
            <div className="ce-header">
              <Eyebrow>05 — CONNECT</Eyebrow>
              <h2 className="ce-h2" id="ce-heading">
                A better next step needs the right connection.
              </h2>
              <p className="ce-sub">
                ScrapMitra aims to help each participant in the e-waste chain discover appropriate next steps — without overpromising what's possible.
              </p>
            </div>
          </AnimatedSection>

          {/* Ecosystem Grid */}
          <div className="ce-ecosystem">

            {/* Central Hub & SVG Connectors (Desktop only) */}
            <div className="ce-hub-wrapper">
              <NetworkHub />
              {/* Mobile Hub Icon */}
              <div className="w-16 h-16 rounded-full bg-[#071C17] border-2 border-[#123C32] flex items-center justify-center relative z-10 md:hidden">
                <svg className="w-6 h-6 text-[#F6F3E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            </div>

            {PARTICIPANTS.map((p, i) => (
              <div key={p.id} id={`for-${p.id}`} className={`ce-card-${p.pos} relative z-10 scroll-mt-24`}>
                <AnimatedSection delay={reduced ? 0 : i * 80}>
                  <div className="ce-card">
                    <img src={p.img} alt="" className="ce-card-img" />
                    <div className="ce-card-text">
                      <h3 className="ce-card-title">{p.label}</h3>
                      <p className="ce-card-desc">{p.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inset Banner */}
      <AnimatedSection delay={reduced ? 0 : 100}>
        <div className="ce-banner-container">
          <div className="ce-banner">

            <img src="/images/banner-landscape.png" alt="" aria-hidden="true" className="ce-banner-art ce-banner-left" />
            <img src="/images/banner-landscape.png" alt="" aria-hidden="true" className="ce-banner-art ce-banner-right" />

            <div className="ce-banner-inner">
              <BannerIcon />

              <h2 className="ce-banner-h2">
                Every device that finds a better next step helps{' '}
                <span className="relative inline-block">
                  close the loop.
                  <svg className="absolute -bottom-[4px] left-0 w-full h-[14px] text-[#E8573A] pointer-events-none" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <path d="M2,12 Q25,2 50,12 T98,12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </h2>
              <p className="ce-banner-sub">
                Keeping useful devices in circulation and materials on a clearer path to recovery.
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

    </section>
  );
}