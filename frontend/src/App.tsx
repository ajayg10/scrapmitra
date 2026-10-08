import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './components/Icon';
import { device_type, type Language } from './generated/taxonomy';
import { iconMap } from './generated/icons';
import deviceCatalog from '../../data/seed/device_catalog.json';

type ActiveTab = 'scan' | 'pickup' | 'collector' | 'impact' | 'leaderboard' | 'admin';

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
  const [showCatalog, setShowCatalog] = useState(false);
  const [powersOn, setPowersOn] = useState<'yes' | 'no' | 'unsure'>('yes');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [activePickup, setActivePickup] = useState<any | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [collectorWeightInput, setCollectorWeightInput] = useState('2.2');
  const [collectorNotice, setCollectorNotice] = useState<string | null>(null);
  const [adminReport, setAdminReport] = useState<any | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const lang: Language = i18n.resolvedLanguage === 'hi' ? 'hi' : 'en';

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Voice synthesis (WebSpeech API with Polly fallback order)
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.onstart = () => setAudioPlaying(true);
    utterance.onend = () => setAudioPlaying(false);
    utterance.onerror = () => setAudioPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  // Perform inspection simulation
  const handleInspect = async () => {
    setIsScanning(true);
    // Call backend API if available, else local deterministic calculation
    try {
      const res = await fetch('http://127.0.0.1:5001/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_key: 'uploads/guest/phone.jpg',
          lang,
          powers_on: powersOn,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        setIsScanning(false);
        return;
      }
    } catch {
      // Fallback local deterministic result if API server not started
    }

    // Default verified scan result (Mobile phone damaged with battery hazard)
    setTimeout(() => {
      setScanResult({
        scan_id: 'scan_demo_4412',
        device: {
          device_type: 'mobile_phone',
          label: lang === 'hi' ? 'स्मार्टफोन (सैमसंग)' : 'Smartphone (Samsung)',
          condition: 'damaged',
          age_band: '3to6',
        },
        hazards: [
          {
            hazard_id: 'HAZ_LI_ION',
            severity: 'HIGH',
            icon: 'BatteryWarning',
            warning: lang === 'hi' ? 'क्षतिग्रस्त लिथियम बैटरी में आग लग सकती है।' : 'A lithium battery may catch fire or explode if punctured or heated.',
            do: [
              lang === 'hi' ? 'फूली या गर्म बैटरी को अलग करें।' : 'Stop handling a hot or swollen battery.',
              lang === 'hi' ? 'अधिकृत रीसाइक्लर को ही सौंपें।' : 'Hand over intact to a verified battery handler.',
            ],
            dont: [
              lang === 'hi' ? 'इसे कभी छेदें या जलाएँ नहीं।' : 'Do not puncture, hammer, or incinerate.',
              lang === 'hi' ? 'घरेलू कचरे में कभी न डालें।' : 'Never put this in household waste.',
            ],
          },
        ],
        decision: {
          recommended_tier: 'REPAIR_THEN_REUSE',
          options: [
            {
              option_id: 'REPAIR_THEN_REUSE',
              title: lang === 'hi' ? 'स्क्रीन मरम्मत और पुनः उपयोग' : 'Screen Repair & Refurbishment',
              money_range: { min: 2500, max: 6500, currency: 'INR' },
              env_rating: 'better',
              co2e_avoided_min_kg: 35.0,
              co2e_avoided_max_kg: 55.0,
              why: lang === 'hi' ? 'मरम्मत खर्च मूल्य के 50% से कम है। स्क्रीन बदलकर फोन को दूसरा जीवन मिलता है।' : 'Repair cost (~₹1,200) is well under 50% of secondary market value. Extends device lifetime.',
            },
            {
              option_id: 'RECYCLE_AUTHORIZED',
              title: lang === 'hi' ? 'अधिकृत रीसाइक्लिंग' : 'Authorized Material Recycling',
              money_range: { min: 80, max: 220, currency: 'INR' },
              env_rating: 'good',
              co2e_avoided_min_kg: 10.0,
              co2e_avoided_max_kg: 18.0,
              why: lang === 'hi' ? 'पंजीकृत रिफाइनरी में सोना, तांबा और कोबाल्ट अलग किया जाता है।' : 'Certified smelters reclaim gold, copper, and cobalt while safely neutralizing battery cells.',
            },
          ],
          comparison_table: [
            {
              option_name: lang === 'hi' ? 'कचरे में फेंकना (डंपिंग)' : 'Throw away (Landfill/Drain)',
              money_text: '₹0',
              env_rating: 'poor',
              co2e_avoided_text: '0 kg CO₂e',
              summary_reason: lang === 'hi' ? 'भारी प्रदूषण: लिथियम आग का खतरा और भूजल में तेजाब।' : 'Extreme pollution: lithium fire hazard and toxic chemicals in soil.',
            },
            {
              option_name: lang === 'hi' ? 'मरम्मत कर उपयोग' : 'Repair & Refurbish',
              money_text: '₹2,500 - ₹6,500',
              env_rating: 'better',
              co2e_avoided_text: '35 - 55 kg CO₂e',
              summary_reason: lang === 'hi' ? 'नया फोन बनने का 85% कार्बन बचाता है।' : 'Restores functional life; avoids 85% of embodied manufacturing carbon.',
            },
            {
              option_name: lang === 'hi' ? 'अधिकृत रीसाइक्लिंग' : 'Authorized Recycling',
              money_text: '₹80 - ₹220',
              env_rating: 'good',
              co2e_avoided_text: '10 - 18 kg CO₂e',
              summary_reason: lang === 'hi' ? 'कीमती धातुएं वापस प्राप्त होती हैं।' : 'Reclaims precious metals; avoids primary bauxite and copper mining.',
            },
          ],
        },
        audio_script: lang === 'hi'
          ? 'सावधानी। लिथियम बैटरी का खतरा पहचाना गया है। स्क्रीन बदलने के बाद इस फोन का मूल्य लगभग ढाई से साढ़े छह हजार रुपये हो सकता है। पिकअप बुक करने के लिए बटन दबाएँ।'
          : 'Caution. High severity lithium battery hazard detected. Device qualifies for screen repair with net value around 2,500 to 6,500 Rupees. Tap Arrange Pickup to connect with a verified collector.',
      });
      setIsScanning(false);
    }, 600);
  };

  const handleBookPickup = () => {
    const newReqId = 'req_' + Math.random().toString(36).substring(2, 8);
    const newQr = `qr_${newReqId}_item1`;
    setActivePickup({
      request_id: newReqId,
      status: 'CLUSTERED',
      device_type: scanResult?.device?.device_type || 'mobile_phone',
      cluster_info: 'Grouped with 3 nearby households in Nehru Place cluster (saved 6.4 km)',
    });
    setQrToken(newQr);
    setActiveTab('pickup');
  };

  const handleConfirmHandover = () => {
    if (!activePickup) return;
    setActivePickup({
      ...activePickup,
      status: 'VERIFIED',
      points_earned: 90,
      kg_diverted: 0.22,
    });
  };

  const handleRunAdminAggregation = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5001/v1/admin/demo/run-aggregation', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAdminReport(data);
        return;
      }
    } catch {
      // Fallback simulation
    }
    setAdminReport({
      status: 'DISPATCHED',
      total_saved_km: 38.6,
      total_co2e_saved_kg: 3.7,
      message: 'Batched 12 open household requests into 3 optimized collector loops! Saved 38.6 km vs single trips.',
    });
  };

  return (
    <>
      <a className="skip-link" href="#main">{t('skip')}</a>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 md:px-10">
        <a className="brand" href="/" aria-label={t('brand')}>
          <span className="brand-icon"><Icon name="Recycle" size={28} /></span>
          <span>
            <strong>Kabadi<span className="text-[var(--green)]">Plus</span></strong>
            <small>v2 · Circular Decision & Pickup</small>
          </span>
        </a>
        <div className="language-picker" role="group" aria-label={t('language')}>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => void i18n.changeLanguage('en')}>English</button>
          <button type="button" lang="hi" aria-pressed={lang === 'hi'} onClick={() => void i18n.changeLanguage('hi')}>हिंदी</button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-5 pb-16 md:px-10">
        {/* Navigation Tabs */}
        <nav className="tab-nav" aria-label="Navigation modes">
          <button type="button" className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
            <Icon name="Camera" size={17} />{t('navScan')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'pickup' ? 'active' : ''}`} onClick={() => setActiveTab('pickup')}>
            <Icon name="QrCode" size={17} />{t('navPickup')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'collector' ? 'active' : ''}`} onClick={() => setActiveTab('collector')}>
            <Icon name="Truck" size={17} />{t('navCollector')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'impact' ? 'active' : ''}`} onClick={() => setActiveTab('impact')}>
            <Icon name="Award" size={17} />{t('navImpact')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            <Icon name="BarChart3" size={17} />{t('navLeaderboard')}
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <Icon name="Users" size={17} />{t('navAdmin')}
          </button>
        </nav>

        <div className="preview-note">
          <span className="status-dot" />
          <strong>{t('preview')}</strong>
          <span>{t('previewNote')}</span>
        </div>

        {/* TAB 1: SCAN & DECIDE */}
        {activeTab === 'scan' && (
          <section>
            <div className="hero">
              <div className="hero-copy">
                <p className="eyebrow">{t('eyebrow')}</p>
                <h1>{t('title')}</h1>
                <p className="hero-subtitle">{t('subtitle')}</p>

                {/* Question: Does it switch on? */}
                <div className="prompt-card">
                  <h3>{t('powersOnQuestion')}</h3>
                  <div className="prompt-options">
                    <button type="button" className={`prompt-btn ${powersOn === 'yes' ? 'selected' : ''}`} onClick={() => setPowersOn('yes')}>{t('yes')}</button>
                    <button type="button" className={`prompt-btn ${powersOn === 'no' ? 'selected' : ''}`} onClick={() => setPowersOn('no')}>{t('no')}</button>
                    <button type="button" className={`prompt-btn ${powersOn === 'unsure' ? 'selected' : ''}`} onClick={() => setPowersOn('unsure')}>{t('unsure')}</button>
                  </div>
                </div>

                <button type="button" className="camera-button" onClick={handleInspect} disabled={isScanning}>
                  <Icon name={isScanning ? 'RefreshCw' : 'Camera'} size={24} />
                  {isScanning ? (lang === 'hi' ? 'जाँच हो रही है...' : 'Inspecting Device...') : t('scan')}
                </button>
                <p className="scan-status">{t('scanSoon')}</p>
                <p className="no-account"><Icon name="ShieldCheck" size={18} />{t('noAccount')}</p>
              </div>

              <div className="device-illustration" aria-hidden="true">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                <div className="device-tile tile-laptop"><Icon name="Laptop" size={80} /></div>
                <div className="device-tile tile-phone"><Icon name="Smartphone" size={62} /></div>
                <div className="device-tile tile-circuit"><Icon name="CircuitBoard" size={42} /></div>
                <div className="recycle-circle"><Icon name="Recycle" size={36} /></div>
              </div>
            </div>

            {/* SCAN RESULTS & DECISION ENGINE */}
            {scanResult && (
              <div className="mt-8">
                {/* 1. NON-COLLAPSIBLE HAZARD BANNER (Safety first) */}
                {scanResult.hazards?.length > 0 && (
                  <div className="hazard-banner" role="alert">
                    <div className="hazard-banner-header">
                      <Icon name="BatteryWarning" size={28} />
                      <div>
                        <h3>{t('safetyAlert')}</h3>
                        <p className="m-0 text-sm">{scanResult.hazards[0].warning}</p>
                      </div>
                    </div>
                    <span className="hazard-never">{t('neverHouseholdWaste')}</span>
                    <div className="hazard-dodont">
                      <div className="hazard-box">
                        <strong className="text-emerald-800">✓ DO:</strong>
                        <ul>
                          {scanResult.hazards[0].do?.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="hazard-box">
                        <strong className="text-red-800">✗ DON'T:</strong>
                        <ul>
                          {scanResult.hazards[0].dont?.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Summary Bar */}
                <div className="result-header">
                  <div className="result-top">
                    <div>
                      <h2>{scanResult.device.label}</h2>
                      <span className="badge-demo">DEMO DATA · SOURCED OCT 2026</span>
                    </div>
                    <button type="button" className="listen-button" onClick={() => speakText(scanResult.audio_script)}>
                      <Icon name="Volume2" size={20} />
                      {audioPlaying ? (lang === 'hi' ? 'चल रहा है...' : 'Playing...') : t('listen')}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 m-0">
                    {lang === 'hi' ? 'निर्णय इंजन परिणाम: चक्रीय वरीयता' : 'Circular Decision Engine ranking based on condition, age, and embodied carbon.'}
                  </p>
                </div>

                {/* Ranked Circular Options */}
                <div className="options-grid">
                  {scanResult.decision?.options?.map((opt: any, idx: number) => (
                    <article key={opt.option_id} className={`option-card ${idx === 0 ? 'recommended' : ''}`}>
                      {idx === 0 && <span className="rec-tag">Recommended Tier</span>}
                      <div>
                        <h3>{opt.title}</h3>
                        {opt.money_range ? (
                          <p className="option-money">₹{opt.money_range.min.toLocaleString()} - ₹{opt.money_range.max.toLocaleString()}</p>
                        ) : (
                          <p className="option-money text-amber-700">Community Social Credit</p>
                        )}
                        <span className="option-co2">
                          <Icon name="Zap" size={14} />
                          {opt.co2e_avoided_min_kg} - {opt.co2e_avoided_max_kg} kg CO₂e saved
                        </span>
                        <p className="option-why">{opt.why}</p>
                      </div>
                      {idx === 0 && (
                        <button type="button" className="camera-button mt-3 w-full" onClick={handleBookPickup}>
                          <Icon name="Truck" size={20} />
                          {t('arrangePickup')}
                        </button>
                      )}
                    </article>
                  ))}
                </div>

                {/* Side-by-side comparison table */}
                <div className="comparison-container">
                  <h3 className="text-base font-bold mb-3">{t('comparisonTitle')}</h3>
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Option</th>
                        <th>Estimated Money</th>
                        <th>Carbon Saved</th>
                        <th>Environmental Trade-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.decision?.comparison_table?.map((row: any, i: number) => (
                        <tr key={i}>
                          <td><strong>{row.option_name}</strong></td>
                          <td>{row.money_text}</td>
                          <td><span className={`rating-pill pill-${row.env_rating}`}>{row.co2e_avoided_text}</span></td>
                          <td>{row.summary_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Catalog toggle */}
            <div className="mt-8 text-center">
              <button type="button" className="catalog-toggle mx-auto" aria-expanded={showCatalog} onClick={() => setShowCatalog(!showCatalog)}>
                {t(showCatalog ? 'hideCatalog' : 'browse')}
                <Icon name={showCatalog ? 'X' : 'ChevronRight'} size={18} />
              </button>
            </div>
            {showCatalog && (
              <section id="device-catalog" className="catalog-section">
                <div className="section-heading">
                  <h2>{t('catalogTitle')}</h2>
                  <span>{t('catalogCount', { count: device_type.length })}</span>
                </div>
                <p className="catalog-note">{t('catalogNote')}</p>
                <ul className="catalog-grid">
                  {device_type.map((id) => (
                    <li key={id}>
                      <Icon name={iconMap.device_type[id]} />
                      <span>{deviceCatalog.items.find((item) => item.device_type === id)?.label[lang] || id}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        )}

        {/* TAB 2: PICKUP & QR (Handover Lifecycle) */}
        {activeTab === 'pickup' && (
          <section className="py-6">
            <div className="pickup-card">
              <h2 className="text-2xl font-bold mb-1">
                {lang === 'hi' ? 'घर से पिकअप और क्यूआर कोड' : 'Doorstep Pickup & Single-Use QR'}
              </h2>
              <p className="text-xs text-slate-500 mb-4">{t('verifiedNotice')}</p>

              {/* Status Stepper */}
              <div className="stepper">
                <div className="step-item active">
                  <span className="step-dot">1</span>
                  <span>Requested</span>
                </div>
                <div className={`step-item ${activePickup ? 'active' : ''}`}>
                  <span className="step-dot">2</span>
                  <span>Clustered</span>
                </div>
                <div className={`step-item ${activePickup?.status === 'VERIFIED' ? 'active' : ''}`}>
                  <span className="step-dot">3</span>
                  <span>Verified</span>
                </div>
              </div>

              {/* QR frame */}
              <div className="qr-frame">
                <Icon name="QrCode" size={140} />
                <p className="text-xs font-mono font-bold mt-2 text-slate-700">{qrToken || 'qr_demo_token_9412'}</p>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded mt-1">Single-Use Token</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-4 text-xs text-emerald-950">
                <strong>Batched Trip Notice:</strong>
                <p className="m-0 mt-1">Your request is pooled with nearby households in Okhla-Nehru Place cluster to save collector transit fuel.</p>
              </div>

              {activePickup?.status === 'VERIFIED' ? (
                <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-4 text-emerald-900 font-semibold">
                  ✓ Handover Verified! +{activePickup.points_earned} Eco Points credited to your impact ledger.
                </div>
              ) : (
                <button type="button" className="camera-button w-full" onClick={handleConfirmHandover}>
                  <Icon name="Check" size={20} />
                  {lang === 'hi' ? 'कबाड़ीवाले के साथ हैंडओवर की पुष्टि करें' : 'Confirm Handover with Collector (2-Party)'}
                </button>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: COLLECTOR MODE (Route Optimization & Savings) */}
        {activeTab === 'collector' && (
          <section className="py-4">
            <div className="section-heading mb-4">
              <div>
                <h2>{lang === 'hi' ? 'कबाड़ीवाला रूट और संग्रह' : "Today's Clustered Collector Route"}</h2>
                <span className="text-xs text-emerald-800 font-semibold">Ramesh Kumar · Vehicle: 3-Wheeler CNG · Hazard Certified</span>
              </div>
              <button type="button" className="listen-button" onClick={() => speakText(lang === 'hi' ? 'भैया आज आपका रूट ओखला और कालकाजी के लिए तैयार है। कुल 28 किलोमीटर की बचत हुई है।' : 'Today your route covers Okhla and Kalkaji. 28 kilometres saved.')}>
                <Icon name="Volume2" size={18} />
                {lang === 'hi' ? 'आवाज़ में सुनें' : 'Listen Route'}
              </button>
            </div>

            {/* Metrics Cards: Measured Km Saved */}
            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-label">{t('routeSavings')}</span>
                <p className="metric-val highlight">28.4 km</p>
                <span className="metric-sub">vs individual household round trips</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">CO₂e Emissions Saved</span>
                <p className="metric-val">2.7 kg</p>
                <span className="metric-sub">avoided fuel burn in city transit</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Estimated Day Earnings</span>
                <p className="metric-val">₹1,850 - ₹2,400</p>
                <span className="metric-sub">5 pooled stops scheduled</span>
              </div>
            </div>

            {/* Stops list with hazard badges */}
            <div className="stops-list mb-6">
              <h3 className="text-sm font-bold mb-3">Pooled Pickup Stops (Optimized 2-Opt Sequence)</h3>
              {[
                { id: 'Stop 1', citizen: 'EcoCitizen-Kalkaji-01', item: 'Laptop (Swollen Battery)', hazard: 'HAZ_LI_ION', wt: '2.1 kg' },
                { id: 'Stop 2', citizen: 'EcoCitizen-NehruPlace-04', item: 'CRT Monitor (Intact Glass)', hazard: 'HAZ_CRT_LEAD', wt: '14.0 kg' },
                { id: 'Stop 3', citizen: 'EcoCitizen-Okhla-08', item: 'Ceiling Fan (Copper Winding)', hazard: null, wt: '4.2 kg' },
              ].map((stop) => (
                <div key={stop.id} className="stop-card">
                  <div className="stop-info">
                    <strong>{stop.id}: {stop.citizen}</strong>
                    <small>{stop.item} · Est: {stop.wt}</small>
                  </div>
                  <div>
                    {stop.hazard ? (
                      <span className="bg-red-100 text-red-800 font-bold text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                        <Icon name="BatteryWarning" size={14} />{stop.hazard}
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 font-semibold text-xs px-2 py-0.5 rounded">Regular Scrap</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Weight entry & sanity check simulation */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold mb-2">Scan Household QR & Record Handover Weight</h3>
              <div className="flex gap-3 flex-wrap items-center">
                <input
                  type="text"
                  placeholder="Enter kg (e.g. 2.2)"
                  value={collectorWeightInput}
                  onChange={(e) => setCollectorWeightInput(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44"
                />
                <button
                  type="button"
                  className="camera-button"
                  onClick={() => {
                    const wt = parseFloat(collectorWeightInput);
                    if (wt > 15.0) {
                      setCollectorNotice('⚠️ Anti-Gaming Flag: Entered weight is 2.5x above expected category range. Flagged for verification.');
                    } else {
                      setCollectorNotice(`✓ Handover weight ${wt}kg verified within category range. Points queued for household confirmation.`);
                    }
                  }}
                >
                  <Icon name="QrCode" size={18} />Verify Weight
                </button>
              </div>
              {collectorNotice && (
                <p className="text-xs font-semibold mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">{collectorNotice}</p>
              )}
            </div>
          </section>
        )}

        {/* TAB 4: MY IMPACT */}
        {activeTab === 'impact' && (
          <section className="py-4">
            <h2 className="text-2xl font-bold mb-2">{lang === 'hi' ? 'मेरा व्यक्तिगत पर्यावरणीय प्रभाव' : 'My Personal Environmental Impact'}</h2>
            <p className="text-xs text-slate-500 mb-6">{t('verifiedNotice')}</p>

            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-label">Verified E-Waste Diverted</span>
                <p className="metric-val highlight">8.5 kg</p>
                <span className="metric-sub">3 verified devices handed over</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Embodied CO₂e Avoided</span>
                <p className="metric-val">29.8 kg</p>
                <span className="metric-sub">equivalent to ~120 km car emissions</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Eco Points Earned</span>
                <p className="metric-val">190 pts</p>
                <span className="metric-sub">Rank #4 in Nehru Place zone</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed">
              <strong>Impact Accounting Standards:</strong>
              <p className="m-0 mt-1">
                Points and diversion statistics are credited strictly on two-party verified physical handovers.
                CO₂e avoidance is calculated based on life cycle assessment (LCA) embodied carbon factors for device reuse and secondary metal smelting offsets.
              </p>
            </div>
          </section>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <section className="py-4">
            <h2 className="text-2xl font-bold mb-1">Environmental Impact Leaderboard</h2>
            <p className="text-xs text-slate-500 mb-6">Verified Handover Only · Pseudonymous Community Handles</p>

            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Participant</th>
                  <th>Kg Diverted</th>
                  <th>Eco Points</th>
                  <th>Items Handed Over</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: 1, name: 'EcoWarrior-NehruPlace', kg: '42.5 kg', pts: '580', items: 6 },
                  { rank: 2, name: 'GreenKalkaji-14', kg: '38.0 kg', pts: '510', items: 5 },
                  { rank: 3, name: 'CleanOkhla-07', kg: '29.4 kg', pts: '430', items: 4 },
                  { rank: 4, name: 'LajpatRecycler-02', kg: '22.1 kg', pts: '340', items: 3 },
                  { rank: 5, name: 'CRParkEco-19', kg: '16.8 kg', pts: '260', items: 2 },
                ].map((row) => (
                  <tr key={row.rank}>
                    <td><span className="rank-badge">{row.rank}</span></td>
                    <td><strong>{row.name}</strong></td>
                    <td>{row.kg}</td>
                    <td className="text-emerald-800 font-bold">{row.pts}</td>
                    <td>{row.items} devices</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 6: ADMIN / AGGREGATION CONTROL */}
        {activeTab === 'admin' && (
          <section className="py-4">
            <div className="section-heading mb-4">
              <div>
                <h2>Admin & Municipal Oversight</h2>
                <span className="text-xs text-slate-500">City Aggregates & On-Demand Route Optimizer</span>
              </div>
            </div>

            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-label">City E-Waste Diverted</span>
                <p className="metric-val">1,485 kg</p>
                <span className="metric-sub">verified across 4 zones</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Transit Kilometres Saved</span>
                <p className="metric-val highlight">386.4 km</p>
                <span className="metric-sub">from intelligent request pooling</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Hazardous Items Neutralized</span>
                <p className="metric-val text-red-700">164 items</p>
                <span className="metric-sub">diverted from open burning/landfills</span>
              </div>
            </div>

            {/* Run Aggregation Now Action */}
            <div className="bg-white border-2 border-dashed border-emerald-400 rounded-2xl p-6 text-center mb-6">
              <h3 className="text-lg font-bold mb-2">Live Demo Control: Route Clustering Engine</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
                Trigger the scheduler now to cluster all pending household requests in Delhi-NCR, assign eligible collectors, and compute measured travel kilometres saved.
              </p>
              <button type="button" className="camera-button mx-auto" onClick={handleRunAdminAggregation}>
                <Icon name="Navigation" size={20} />
                Run Pickup Aggregation Now
              </button>

              {adminReport && (
                <div className="mt-5 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-left text-xs text-emerald-950">
                  <strong className="block text-sm font-bold text-emerald-900 mb-1">✓ Aggregation Dispatched!</strong>
                  <p className="m-0 mb-2">{adminReport.message}</p>
                  <div className="flex gap-6 font-mono text-emerald-800">
                    <span>Saved Distance: <strong>{adminReport.total_saved_km} km</strong></span>
                    <span>Saved Carbon: <strong>{adminReport.total_co2e_saved_kg} kg CO₂e</strong></span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <footer>
          <p>{t('footer')}</p>
          <span>{t('status')}</span>
        </footer>
      </main>
    </>
  );
}
