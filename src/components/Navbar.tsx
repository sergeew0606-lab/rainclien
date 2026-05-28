import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, User, LogOut, ChevronDown, Download, ShoppingCart } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { t, lang, setLang, user, setShowAuth, setPage, page, logout, setShowPurchase, downloadLoader } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const hasSub = user?.subscription.status === 'active';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.purchase, href: '#purchase', action: () => user ? setShowPurchase(true) : setShowAuth('register') },
    { label: t.nav.support, href: 'https://t.me/RainDLCClient', external: true },
    { label: t.nav.legal, href: '#legal' },
  ];

  const handleNavClick = (link: typeof navLinks[0]) => {
    if (link.external) {
      window.open(link.href, '_blank');
      setMobileOpen(false);
      return;
    }
    if (link.action) {
      link.action();
      setMobileOpen(false);
      return;
    }
    if (page !== 'home') setPage('home');
    setMobileOpen(false);
    setTimeout(() => {
      const el = document.querySelector(link.href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-bg-dark/80 backdrop-blur-xl border-b border-border-subtle'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <motion.button
          onClick={() => { setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="text-2xl font-bold gradient-text tracking-tight"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          rainclient
        </motion.button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link, i) => (
            <motion.button
              key={link.label}
              onClick={() => handleNavClick(link)}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.5 }}
              className="text-sm text-text-muted hover:text-white transition-colors duration-300 relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
            </motion.button>
          ))}

          {/* Lang switcher */}
          <div className="relative">
            <motion.button
              onClick={() => { setLangOpen(!langOpen); setUserMenuOpen(false); }}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-white transition-colors px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg"
              whileHover={{ scale: 1.05 }}
            >
              <Globe size={14} />
              {lang.toUpperCase()}
              <ChevronDown size={12} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </motion.button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl z-50 min-w-[100px]"
                >
                  <button
                    onClick={() => { setLang('ru'); setLangOpen(false); }}
                    className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-white/5 transition-colors ${lang === 'ru' ? 'text-primary' : 'text-text-muted'}`}
                  >
                    🇷🇺 Русский
                  </button>
                  <button
                    onClick={() => { setLang('en'); setLangOpen(false); }}
                    className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-white/5 transition-colors ${lang === 'en' ? 'text-primary' : 'text-text-muted'}`}
                  >
                    🇺🇸 English
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auth */}
          {user ? (
            <div className="relative">
              <motion.button
                onClick={() => { setUserMenuOpen(!userMenuOpen); setLangOpen(false); }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 text-sm text-white bg-primary/20 hover:bg-primary/30 border border-primary/30 px-4 py-2 rounded-full transition-all duration-300"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center text-xs font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                {user.username}
                <ChevronDown size={12} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl z-50 min-w-[200px]"
                  >
                    <button
                      onClick={() => { setPage('profile'); setUserMenuOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User size={16} />
                      {t.nav.profile}
                    </button>
                    <button
                      onClick={() => { setShowPurchase(true); setUserMenuOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <ShoppingCart size={16} />
                      {t.nav.purchase}
                    </button>
                    {hasSub && (
                      <button
                        onClick={() => { downloadLoader(); setUserMenuOpen(false); }}
                        className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 text-green-400 hover:text-green-300 hover:bg-green-500/5 transition-colors"
                      >
                        <Download size={16} />
                        {t.nav.download}
                      </button>
                    )}
                    <div className="border-t border-white/5" />
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut size={16} />
                      {t.nav.logout}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setShowAuth('login')}
                whileHover={{ scale: 1.05 }}
                className="text-sm text-text-muted hover:text-white transition-colors px-4 py-2"
              >
                {t.nav.signin}
              </motion.button>
              <motion.button
                onClick={() => setShowAuth('register')}
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}
                className="text-sm text-white/90 bg-primary/20 hover:bg-primary/30 border border-primary/30 px-5 py-2 rounded-full transition-all duration-300"
              >
                {t.nav.signup}
              </motion.button>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-bg-dark/95 backdrop-blur-xl border-b border-border-subtle overflow-hidden"
          >
            <div className="px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="block text-text-muted hover:text-white transition-colors w-full text-left"
                >
                  {link.label}
                </button>
              ))}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setLang('ru'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${lang === 'ru' ? 'bg-primary/20 border-primary/30 text-white' : 'border-white/10 text-text-muted'}`}
                >
                  🇷🇺 RU
                </button>
                <button
                  onClick={() => { setLang('en'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${lang === 'en' ? 'bg-primary/20 border-primary/30 text-white' : 'border-white/10 text-text-muted'}`}
                >
                  🇺🇸 EN
                </button>
              </div>

              {user ? (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPage('profile'); setMobileOpen(false); }}
                      className="flex-1 text-center text-sm text-white bg-primary/20 border border-primary/30 px-5 py-2 rounded-full"
                    >
                      {t.nav.profile}
                    </button>
                    <button
                      onClick={() => { setShowPurchase(true); setMobileOpen(false); }}
                      className="flex-1 text-center text-sm text-white bg-white/5 border border-white/10 px-5 py-2 rounded-full"
                    >
                      {t.nav.purchase}
                    </button>
                  </div>
                  {hasSub && (
                    <button
                      onClick={() => { downloadLoader(); setMobileOpen(false); }}
                      className="w-full text-center text-sm text-white bg-green-600/20 border border-green-500/30 px-5 py-2 rounded-full flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      {t.nav.download} Loader
                    </button>
                  )}
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full text-center text-sm text-red-400 border border-red-500/20 px-4 py-2 rounded-full"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowAuth('login'); setMobileOpen(false); }}
                    className="flex-1 text-center text-sm text-text-muted border border-white/10 px-4 py-2 rounded-full"
                  >
                    {t.nav.signin}
                  </button>
                  <button
                    onClick={() => { setShowAuth('register'); setMobileOpen(false); }}
                    className="flex-1 text-center text-sm text-white bg-primary/20 border border-primary/30 px-5 py-2 rounded-full"
                  >
                    {t.nav.signup}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
