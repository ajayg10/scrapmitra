import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import TickerBanner from '../components/landing/TickerBanner';
import ProblemSection from '../components/landing/ProblemSection';
import DeviceDiscoverySection from '../components/landing/DeviceDiscoverySection';
import DeviceAssessmentSection from '../components/landing/DeviceAssessmentSection';
import DecisionPathSection from '../components/landing/DecisionPathSection';
import CircularEconomySection from '../components/landing/CircularEconomySection';
import FinalCTASection from '../components/landing/FinalCTASection';
import Footer from '../components/landing/Footer';
import '../landing.css';

export default function LandingPage() {
  return (
    <div className="lb-landing">
      {/* Skip-to-main for keyboard users */}
      <a
        href="#hero"
        className="lb-skip-link"
        onFocus={e => { (e.target as HTMLAnchorElement).style.top = '12px'; }}
        onBlur={e => { (e.target as HTMLAnchorElement).style.top = '-80px'; }}
      >
        Skip to main content
      </a>

      <Navbar />
      <HeroSection />
      <TickerBanner />

      <main id="main">
        <ProblemSection />
        <DeviceDiscoverySection />
        <DeviceAssessmentSection />
        <DecisionPathSection />
        <CircularEconomySection />
        <FinalCTASection />
      </main>

      <Footer />
    </div>
  );
}
