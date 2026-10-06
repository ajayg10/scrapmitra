import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './components/Icon';
import { device_type, type Language } from './generated/taxonomy';
import { iconMap } from './generated/icons';
import deviceCatalog from '../../data/seed/device_catalog.json';

export default function App() {
  const { t, i18n } = useTranslation();
  const [showCatalog, setShowCatalog] = useState(false);
  const lang: Language = i18n.resolvedLanguage === 'hi' ? 'hi' : 'en';

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  return <>
    <a className="skip-link" href="#main">{t('skip')}</a>
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-6 md:px-10">
      <a className="brand" href="/" aria-label={t('brand')}>
        <span className="brand-icon"><Icon name="Recycle" size={28} /></span>
        <span><strong>Kabadi<span className="text-[var(--green)]">Plus</span></strong><small>{t('tagline')}</small></span>
      </a>
      <div className="language-picker" role="group" aria-label={t('language')}>
        <button type="button" aria-pressed={lang === 'en'} onClick={() => void i18n.changeLanguage('en')}>English</button>
        <button type="button" lang="hi" aria-pressed={lang === 'hi'} onClick={() => void i18n.changeLanguage('hi')}>हिंदी</button>
      </div>
    </header>

    <main id="main" className="mx-auto max-w-6xl px-5 pb-12 md:px-10">
      <div className="preview-note"><span className="status-dot" /><strong>{t('preview')}</strong><span>{t('previewNote')}</span></div>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="hero-subtitle">{t('subtitle')}</p>
          <button type="button" className="camera-button" disabled aria-describedby="scan-status"><Icon name="Camera" size={28} />{t('scan')}</button>
          <p className="scan-status" id="scan-status">{t('scanSoon')}</p>
          <button type="button" className="catalog-toggle" aria-expanded={showCatalog} aria-controls="device-catalog" onClick={() => setShowCatalog(!showCatalog)}>{t(showCatalog ? 'hideCatalog' : 'browse')}<Icon name={showCatalog ? 'X' : 'ChevronRight'} size={20} /></button>
          <p className="no-account"><Icon name="ShieldCheck" size={18} />{t('noAccount')}</p>
        </div>
        <div className="device-illustration" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="device-tile tile-laptop"><Icon name="Laptop" size={86} /></div>
          <div className="device-tile tile-phone"><Icon name="Smartphone" size={68} /></div>
          <div className="device-tile tile-circuit"><Icon name="CircuitBoard" size={46} /></div>
          <div className="recycle-circle"><Icon name="Recycle" size={38} /></div>
          <span className="tiny-dot dot-one" /><span className="tiny-dot dot-two" />
        </div>
      </section>
      <section className="steps-section" aria-labelledby="steps-heading">
        <div className="section-heading"><h2 id="steps-heading">{t('howTitle')}</h2><span>{t('planned')}</span></div>
        <div className="steps-grid">
          {(['Camera', 'ShieldCheck', 'MapPin'] as const).map((name, index) => <article className="step-card" key={name}>
            <div className="step-top"><span className="step-icon"><Icon name={name} size={26} /></span><span className="step-number">0{index + 1}</span></div>
            <h3>{t(`step${index + 1}Title`)}</h3><p>{t(`step${index + 1}Body`)}</p>
          </article>)}
        </div>
      </section>
      <aside className="safety-note"><span><Icon name="ShieldAlert" size={27} /></span><div><h2>{t('safetyTitle')}</h2><p>{t('safetyBody')}</p></div></aside>
      <section id="device-catalog" className="catalog-section" hidden={!showCatalog} aria-labelledby="catalog-heading">
        <div className="section-heading"><h2 id="catalog-heading">{t('catalogTitle')}</h2><span>{t('catalogCount', { count: device_type.length })}</span></div>
        <p className="catalog-note">{t('catalogNote')}</p>
        <ul className="catalog-grid">{device_type.map((id) => <li key={id}><Icon name={iconMap.device_type[id]} /><span>{deviceCatalog.items.find((item) => item.device_type === id)!.label[lang]}</span></li>)}</ul>
      </section>
      <footer><p>{t('footer')}</p><span>{t('status')}</span></footer>
    </main>
  </>;
}
