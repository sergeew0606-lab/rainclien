import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useRef, useEffect, useState } from 'react';

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export default function Hero() {
  const { t, setShowAuth, user, setShowPurchase } = useApp();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] float-anim" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-zinc-600/10 rounded-full blur-[120px] float-anim" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px] pulse-glow" />
      </div>

      {/* Rotating rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/5 rounded-full rotate-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/3 rounded-full rotate-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-primary-light tracking-wide uppercase">{t.hero.badge}</span>
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-6"
        >
          <span className="gradient-text glow-text">{t.hero.title}</span>
          <span className="block text-white/90 text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mt-4">
            {t.hero.subtitle}{' '}
            <span className="gradient-text font-semibold">{t.hero.win}</span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-12"
        >
          {t.hero.desc}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            onClick={() => user ? setShowPurchase(true) : setShowAuth('register')}
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3.5 bg-gradient-to-r from-primary to-zinc-600 text-white font-medium rounded-full text-sm transition-all duration-300 shadow-lg shadow-primary/25"
          >
            {t.hero.getStarted}
          </motion.button>
          <motion.a
            href="#features"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium rounded-full text-sm transition-all duration-300"
          >
            {t.hero.learnMore}
          </motion.a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto"
        >
          {(() => {
            const uidCount = parseInt(localStorage.getItem('rainclient_uid_counter') || '0', 10);
            return [
              { value: uidCount, label: t.stats.users, suffix: '+' },
              { value: 10, label: t.stats.servers, suffix: '+' },
              { value: 99, label: t.stats.uptime, suffix: '%' },
              { value: 4, label: t.stats.updates, suffix: '' },
            ];
          })().map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="text-center cursor-default"
            >
              <p className="text-2xl md:text-3xl font-bold gradient-text">
                <AnimatedCounter target={stat.value} />{stat.suffix}
              </p>
              <p className="text-text-muted text-xs mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="text-text-muted" size={24} />
        </motion.div>
      </motion.div>
    </section>
  );
}
