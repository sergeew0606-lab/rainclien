import { motion } from 'framer-motion';
import { useInView } from './useInView';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const { ref, inView } = useInView(0.1);
  const { t, setShowPurchase, user, setShowAuth, downloadLoader } = useApp();

  const hasSub = user?.subscription.status === 'active';

  return (
    <footer id="legal" ref={ref} className="relative border-t border-border-subtle">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="grid md:grid-cols-4 gap-12 mb-16"
        >
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold gradient-text mb-3">rainclient</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t.footer.product}</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => hasSub ? downloadLoader() : (user ? setShowPurchase(true) : setShowAuth('register'))}
                  className="text-text-muted hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  {t.footer.download}
                </button>
              </li>
              <li>
                <button
                  onClick={() => user ? setShowPurchase(true) : setShowAuth('register')}
                  className="text-text-muted hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  {t.footer.purchase}
                </button>
              </li>
              <li>
                <a href="https://t.me/RainDLCClient" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block">
                  {t.footer.support}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t.footer.legal}</h4>
            <ul className="space-y-3">
              {[t.footer.agreement, t.footer.privacy, t.footer.refund].map((item) => (
                <li key={item}>
                  <a href="#" className="text-text-muted hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t.footer.community}</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://discord.gg/VBZmE3NktC" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block">
                  Discord
                </a>
              </li>
              <li>
                <a href="https://t.me/RainDLCClient" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block">
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="border-t border-border-subtle pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-text-muted text-xs">{t.footer.rights}</p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <a href="https://discord.gg/VBZmE3NktC" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a>
            <span>·</span>
            <a href="https://t.me/RainDLCClient" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram</a>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center text-text-muted/50 text-xs mt-8"
        >
          {t.footer.credit}
        </motion.p>
      </div>
    </footer>
  );
}
