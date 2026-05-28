import { motion } from 'framer-motion';
import { useInView } from './useInView';
import { Zap, Crosshair, Sparkles, ShieldCheck, Blocks, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function WhyRainDLC() {
  const { ref, inView } = useInView(0.2);
  const { t } = useApp();

  const features = [
    {
      icon: <Sparkles size={28} />,
      title: t.why.f1_title,
      desc: t.why.f1_desc,
      color: 'from-violet-500 to-zinc-600',
    },
    {
      icon: <Crosshair size={28} />,
      title: t.why.f2_title,
      desc: t.why.f2_desc,
      color: 'from-zinc-500 to-fuchsia-600',
    },
    {
      icon: <Zap size={28} />,
      title: t.why.f3_title,
      desc: t.why.f3_desc,
      color: 'from-fuchsia-500 to-pink-600',
    },
    {
      icon: <ShieldCheck size={28} />,
      title: t.why.f4_title,
      desc: t.why.f4_desc,
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: <Blocks size={28} />,
      title: t.why.f5_title,
      desc: t.why.f5_desc,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: <Eye size={28} />,
      title: t.why.f6_title,
      desc: t.why.f6_desc,
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <section id="features" ref={ref} className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-primary-light mb-4 block">{t.why.label}</span>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            {t.why.title} <span className="gradient-text">RainDLC</span>?
          </h2>
          <p className="text-text-muted mt-4 text-lg">{t.why.subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="gradient-border p-8 group cursor-default"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-text-muted leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
