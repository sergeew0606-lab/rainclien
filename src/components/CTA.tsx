import { motion } from 'framer-motion';
import { useInView } from './useInView';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CTA() {
  const { ref, inView } = useInView(0.2);
  const { t, user, setShowAuth, setShowPurchase } = useApp();

  const handlePurchase = () => {
    if (!user) {
      setShowAuth('register');
    } else {
      setShowPurchase(true);
    }
  };

  return (
    <section id="purchase" ref={ref} className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[200px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="text-xs uppercase tracking-[0.3em] text-primary-light mb-4 block">
            {t.cta.label}
          </span>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            {t.cta.title1}{' '}
            <span className="gradient-text">{t.cta.title2}</span>
            <br />{t.cta.title3}{' '}
            <span className="gradient-text">rainclient</span>
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-text-muted text-lg max-w-xl mx-auto mb-12 leading-relaxed"
        >
          {t.cta.desc}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            onClick={handlePurchase}
            whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(139,92,246,0.4)' }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-zinc-600 text-white font-semibold rounded-full text-sm transition-all duration-300 shadow-xl shadow-primary/25"
          >
            {t.cta.purchase}
            <ArrowRight size={16} />
          </motion.button>
          <motion.a
            href="https://t.me/zexoki"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium rounded-full text-sm transition-all duration-300"
          >
            <MessageCircle size={16} />
            {t.cta.contact}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
