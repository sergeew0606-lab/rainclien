import { motion } from 'framer-motion';
import { useInView } from './useInView';
import {
  Cloud, Layers, Keyboard, Headphones, MessageCircle,
  Gauge, Palette, Code2, Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Features() {
  const { ref, inView } = useInView(0.1);
  const { t } = useApp();

  const fs = t.featuresSection;

  const features = [
    { icon: <Layers size={24} />, title: fs.fabric, desc: fs.fabricDesc, number: '1' },
    { icon: <Keyboard size={24} />, title: fs.binds, desc: fs.bindsDesc, number: '' },
    { icon: <Headphones size={24} />, title: fs.supportTitle, desc: fs.supportDesc, number: '' },
    { icon: <MessageCircle size={24} />, title: fs.chat, desc: fs.chatDesc, number: '2' },
    { icon: <Gauge size={24} />, title: fs.optimization, desc: fs.optimizationDesc, number: '' },
    { icon: <Palette size={24} />, title: fs.ui, desc: fs.uiDesc, number: '3' },
    { icon: <Code2 size={24} />, title: fs.scripts, desc: fs.scriptsDesc, number: '4' },
    { icon: <Target size={24} />, title: fs.targetHud, desc: fs.targetHudDesc, number: '' },
  ];

  return (
    <section id="support" ref={ref} className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main feature card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-border p-10 md:p-16 mb-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] group-hover:bg-primary/10 transition-colors duration-700" />
          <div className="relative z-10 max-w-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
              <Cloud size={32} />
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary-light mb-2 block">
              {fs.cloudSub}
            </span>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">{fs.cloudTitle}</h3>
            <p className="text-text-muted text-lg leading-relaxed">{fs.cloudDesc}</p>
          </div>
          <div className="absolute top-8 right-8 text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">
            rainclient
          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 * i + 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5, transition: { duration: 0.25 } }}
              className="gradient-border p-7 group cursor-default relative overflow-hidden"
            >
              {f.number && (
                <div className="absolute top-3 right-5 text-5xl font-black text-white/[0.03] select-none pointer-events-none">
                  {f.number}
                </div>
              )}
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                {f.icon}
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{f.title}</h4>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
