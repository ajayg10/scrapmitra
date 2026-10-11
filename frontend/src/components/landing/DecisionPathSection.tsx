import { useState } from 'react';
import AnimatedSection from './ui/AnimatedSection';
import Eyebrow from './ui/Eyebrow';
import {
  Wrench,
  RefreshCw,
  Heart,
  Recycle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { usePrefersReducedMotion } from './hooks';

const PATHS = [
  {
    id: 'repair',
    num: '01',
    Icon: Wrench,
    label: 'Repair',
    desc: 'Restore the device when repair is practical, safe, and worthwhile.',
  },
  {
    id: 'reuse',
    num: '02',
    Icon: RefreshCw,
    label: 'Reuse / Resell',
    desc: 'Keep a suitable working device in circulation.',
  },
  {
    id: 'donate',
    num: '03',
    Icon: Heart,
    label: 'Donate',
    desc: 'Pass a suitable functional device to someone who can use it.',
  },
  {
    id: 'recycle',
    num: '04',
    Icon: Recycle,
    label: 'Recycle',
    desc: 'Recover materials through appropriate recycling channels.',
  },
  {
    id: 'dispose',
    num: '05',
    Icon: AlertTriangle,
    label: 'Safe Disposal',
    desc: 'Route unsafe devices to specialist recyclers.',
  },
];

export default function DecisionPathSection() {
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();

  return (
    <section
      id="our-approach"
      className="dp-section"
      aria-labelledby="dp-heading"
    >
      <div id="choose" className="sr-only" />
      <style>{`
        .dp-section {
          background: #0B2923;
          padding: 96px 0 100px 0; /* Reduced top padding by 20% (from 120px to 96px), reduced bottom */
          position: relative;
          overflow: hidden;
        }

        /* Subtle dot texture overlay */
        .dp-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(168, 189, 165, 0.07) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        .dp-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 clamp(1.5rem, 4vw, 3rem);
          position: relative;
          z-index: 1;
        }

        .dp-header {
          text-align: center;
          margin-bottom: clamp(2.5rem, 5vw, 3.5rem); /* Reduced bottom margin */
          display: flex;
          flex-direction: column;
          align-items: center; /* Ensures everything centers */
        }

        .dp-header > * {
          margin-left: auto;
          margin-right: auto;
        }

        .dp-header > p:first-child {
          margin-bottom: 8px !important; /* Tighter gap under eyebrow */
        }

        .dp-h2 {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          letter-spacing: -1px;
          color: #F6F3E9;
          line-height: 1.1;
          margin: 0 0 12px; /* Tighter gap under headline */
          text-wrap: balance;
        }

        .dp-sub {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: clamp(1rem, 1.2vw, 1.15rem);
          color: #A8BDA5;
          max-width: 650px; /* Specific max-width constraint for body text as requested */
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Main two-column layout */
        .dp-body {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(2.5rem, 5vw, 4rem);
          align-items: start;
        }

        @media (min-width: 960px) {
          .dp-body {
            grid-template-columns: 1fr 1fr;
            align-items: center;
          }
        }

        /* --- LEFT: Image column --- */
        .dp-img-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .dp-img-frame {
          position: relative;
          border-radius: 0;
          overflow: hidden;
          border: 3px solid #0F1A17;
          box-shadow: -10px 10px 0 #0F3D33;
          aspect-ratio: 4 / 3;
          background: #071C17;
        }

        .dp-img-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 15%;
          display: block;
          border-radius: 0;
          transition: transform 0.8s ease;
        }

        .dp-img-frame:hover img {
          transform: scale(1.02);
        }

        .dp-img-caption {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .dp-caption-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(168, 189, 165, 0.6);
        }

        .dp-caption-value {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 13px;
          color: rgba(246, 243, 233, 0.65);
        }

        .dp-caption-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #F15B40;
          flex-shrink: 0;
          margin-bottom: 2px;
        }

        /* --- RIGHT: Selector column --- */
        .dp-selector-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dp-selector-hint {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(168, 189, 165, 0.5);
          margin-bottom: 8px;
        }

        /* Path item button */
        .dp-path-btn {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          border-radius: 12px;
          transition: none;
        }

        .dp-path-btn:focus-visible .dp-path-inner {
          outline: 2px solid #F15B40;
          outline-offset: 2px;
        }

        .dp-path-inner {
          display: flex;
          flex-direction: column;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid rgba(215, 227, 210, 0.2); /* Subtle green border */
          background: #0B2923; /* Same dark forest-green as section */
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-inner {
          background: #F6F3E9; /* Warm ivory */
          border-color: #F6F3E9;
        }

        .dp-path-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .dp-path-num {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 1px;
          color: rgba(215, 227, 210, 0.6);
          flex-shrink: 0;
          width: 20px;
          transition: color 0.3s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-num {
          color: rgba(18, 60, 50, 0.6);
        }

        .dp-path-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(215, 227, 210, 0.08);
          flex-shrink: 0;
          color: #D7E3D2; /* Muted sage */
          transition: background 0.3s ease, color 0.3s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-icon {
          background: rgba(18, 60, 50, 0.08); /* slight contrast against ivory */
          color: #123C32; /* Forest green */
        }

        .dp-path-label {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #D7E3D2; /* Muted sage */
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.3s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-label {
          color: #123C32; /* Forest green */
        }

        .dp-path-arrow {
          color: rgba(215, 227, 210, 0.4);
          flex-shrink: 0;
          transition: color 0.3s ease, transform 0.3s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-arrow {
          color: #F15B40; /* Coral */
          transform: translateX(4px);
        }

        /* Expanded description (smooth height expansion) */
        .dp-path-desc-wrapper {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-desc-wrapper {
          grid-template-rows: 1fr;
        }

        .dp-path-desc-inner {
          overflow: hidden;
        }

        .dp-path-desc {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.55;
          color: #123C32;
          margin: 0;
          padding-left: 48px;
          padding-top: 10px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .dp-path-btn[data-hovered="true"] .dp-path-desc {
          opacity: 1;
          transition: opacity 0.3s ease 0.1s;
        }

        /* Disclaimer */
        .dp-disclaimer {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(168, 189, 165, 0.1);
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .dp-disclaimer-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          line-height: 1.6;
          letter-spacing: 0.3px;
          color: rgba(168, 189, 165, 0.45);
          margin: 0;
        }

        /* Mobile */
        @media (max-width: 959px) {
          .dp-section {
            padding: 80px 0;
          }
          .dp-img-frame {
            aspect-ratio: 16 / 9;
          }
        }

        @media (max-width: 639px) {
          .dp-section {
            padding: 60px 0;
          }
          .dp-img-frame {
            box-shadow: 6px 6px 0 #0F3D33;
          }
          .dp-path-inner {
            padding: 14px 16px;
          }
          .dp-path-label {
            font-size: 15px;
          }
        }
      `}</style>

      <div className="dp-container">
        {/* Header */}
        <AnimatedSection>
          <div className="dp-header">
            <Eyebrow light>05 — CHOOSE ITS NEXT LIFE</Eyebrow>
            <h2 className="dp-h2" id="dp-heading">Not every device belongs in the same bin.</h2>
            <p className="dp-sub">
              The right path depends on the device's condition, safety status, and available recovery options.
            </p>
          </div>
        </AnimatedSection>

        {/* Body: image + selector */}
        <div className="dp-body">

          {/* LEFT — photograph */}
          <AnimatedSection delay={100}>
            <div className="dp-img-col">
              <div className="dp-img-frame">
                <img
                  src="/images/loopback-next-life-phone.jpg"
                  alt="A cracked smartphone resting on a charcoal stone with green leaves behind it, illustrating a device awaiting its next life."
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="dp-img-caption">
                <div className="dp-caption-dot" />
                <span className="dp-caption-label">Your Device</span>
                <span className="dp-caption-value">Smartphone · Example device</span>
              </div>
            </div>
          </AnimatedSection>

          {/* RIGHT — interactive selector */}
          <AnimatedSection delay={200}>
            <div className="dp-selector-col" onMouseLeave={() => setHovered(null)}>
              <p className="dp-selector-hint">Select a recovery path</p>

              {PATHS.map((path, i) => {
                const isHovered = hovered === path.id;
                return (
                  <button
                    key={path.id}
                    className="dp-path-btn"
                    data-hovered={isHovered ? 'true' : 'false'}
                    onMouseEnter={() => setHovered(path.id)}
                    onFocus={() => setHovered(path.id)}
                    aria-expanded={isHovered}
                    aria-label={`${path.num} — ${path.label}: ${path.desc}`}
                    style={{
                      transitionDelay: reduced ? '0ms' : `${i * 40}ms`,
                    }}
                  >
                    <div className="dp-path-inner">
                      <div className="dp-path-row">
                        <span className="dp-path-num">{path.num}</span>
                        <span className="dp-path-icon">
                          <path.Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className="dp-path-label">{path.label}</span>
                        <ChevronRight size={16} strokeWidth={1.5} className="dp-path-arrow" aria-hidden="true" />
                      </div>
                      <div className="dp-path-desc-wrapper">
                        <div className="dp-path-desc-inner">
                          <p className="dp-path-desc">
                            {path.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              <p className="dp-disclaimer-text" style={{ marginTop: 12, paddingLeft: 4 }}>
                These are possible pathways, not guaranteed outcomes for every device.
              </p>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </section>
  );
}
