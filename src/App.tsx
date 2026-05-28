import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WhyRainDLC from './components/WhyRainDLC';
import Testimonial from './components/Testimonial';
import Features from './components/Features';
import CTA from './components/CTA';
import Footer from './components/Footer';
import ParticleField from './components/ParticleField';
import AuthModal from './components/AuthModal';
import PurchaseModal from './components/PurchaseModal';
import Profile from './components/Profile';

function AppContent() {
  const { page, showAuth, showPurchase } = useApp();

  return (
    <div className="relative noise-overlay">
      <ParticleField />
      <div className="relative z-10">
        <Navbar />
        {showAuth && <AuthModal />}
        {showPurchase && <PurchaseModal />}
        {page === 'home' ? (
          <>
            <Hero />
            <WhyRainDLC />
            <Testimonial />
            <Features />
            <CTA />
            <Footer />
          </>
        ) : (
          <Profile />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
