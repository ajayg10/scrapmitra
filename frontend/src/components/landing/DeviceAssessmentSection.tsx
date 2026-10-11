import AnimatedSection from './ui/AnimatedSection';
import Eyebrow from './ui/Eyebrow';

const ASSESSMENT_FIELDS = [
  { label: 'ASSESSMENT STATUS', value: 'PRELIMINARY', color: '#F4B942', bg: '#FDF5E0' },
  { label: 'CONDITION', value: 'REQUIRES INSPECTION', color: '#F15B40', bg: '#FEF0ED' },
  { label: 'BATTERY SAFETY', value: 'NOT YET VERIFIED', color: '#66776E', bg: '#F0F4F2' },
  { label: 'NEXT STEP', value: 'INSPECT BEFORE REFURBISHMENT', color: '#123C32', bg: '#EDF5EE' },
];

const MATERIALS = ['Aluminium', 'Copper', 'Glass', 'Li-Ion cells'];

export default function DeviceAssessmentSection() {
  return (
    <section className="lb-section lb-section-ivory understand" style={{ position: 'relative', overflow: 'hidden' }}>
      
      <style>{`
        .understand {
          padding-bottom: clamp(5rem, 10vw, 10rem);
        }
        .understand::before {
          content: "";
          position: absolute;
          inset: 0;
          background: url("/images/landscape-divider.png") no-repeat center bottom / 100% auto;
          opacity: 0.35;
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 699px) {
          .understand {
            padding-bottom: clamp(3rem, 12vw, 5rem);
          }
          .understand::before {
            background-size: auto 140px;
            background-position: left bottom;
          }
        }
      `}</style>

      <div className="lb-container lb-split-grid" style={{ position: 'relative', zIndex: 1 }}>
        {/* Left: explanation */}
        <AnimatedSection>
          <Eyebrow>04 — UNDERSTAND</Eyebrow>
          <h2 className="lb-h2">
            Before finding a buyer, <br className="hidden min-[1100px]:block" />
            <span style={{ position: 'relative', display: 'inline-block', paddingBottom: '0.1em' }}>
              understand the device.
              <svg style={{ position: 'absolute', width: '85%', height: '6px', left: 0, bottom: '2px' }} viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2,5 Q50,9 98,3" fill="none" stroke="var(--lb-coral)" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="lb-body lb-muted" style={{ marginBottom: 32 }}>
            AI-based image assessment provides a useful starting point — but cannot certify a
            device as safe. A preliminary assessment helps you understand potential risks and
            decide on the right next step.
          </p>
          <div className="lb-alert lb-alert-coral" style={{ maxWidth: '42ch', backgroundColor: 'var(--lb-coral-light)', borderColor: 'rgba(241, 91, 64, 0.2)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lb-coral)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="1.5" fill="var(--lb-coral)" stroke="none" />
            </svg>
            <p className="lb-alert-text">
              <strong style={{ color: 'var(--lb-forest)' }}>Important:</strong> AI image assessment is illustrative and preliminary. It
              does not constitute professional inspection, safety certification, or financial
              valuation.
            </p>
          </div>
        </AnimatedSection>

        {/* Right: assessment panel */}
        <AnimatedSection delay={200}>
          <div className="lb-panel" style={{ border: '1px solid var(--lb-forest-light)', boxShadow: '12px 12px 0 var(--lb-coral)' }}>
            {/* Panel header */}
            <div className="lb-panel-header">
              <div>
                <div className="lb-panel-meta">SCRAPMITRA · ASSESSMENT PANEL</div>
                <div className="lb-panel-title">Smartphone — Example Device</div>
              </div>
              <span className="lb-chip lb-chip-illustrative">ILLUSTRATIVE</span>
            </div>

            {/* Fields */}
            <div className="lb-panel-fields">
              {ASSESSMENT_FIELDS.map(f => (
                <div
                  key={f.label}
                  className="lb-panel-row"
                  style={{ background: f.bg }}
                >
                  <span className="lb-panel-row-label">{f.label}</span>
                  <span className="lb-panel-row-value" style={{ color: f.color }}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Material recovery */}
            <div className="lb-panel-recovery">
              <div className="lb-panel-recovery-label">Possible material recovery</div>
              <div className="lb-tag-row">
                {MATERIALS.map(m => (
                  <span key={m} className="lb-material-tag">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
