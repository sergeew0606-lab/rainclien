import { motion } from 'framer-motion';
import { useInView } from './useInView';
import { Quote } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Testimonial() {
  const { ref, inView } = useInView(0.2);
  const { t } = useApp();

  const testimonials = [
    { quote: t.testimonial.quote, name: t.testimonial.name, role: t.testimonial.role, letter: 'T' },
    { quote: t.testimonial.quote2, name: t.testimonial.name2, role: t.testimonial.role2, letter: 'D' },
  ];

  return (
    <section ref={ref} className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
        {testimonials.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: idx * 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="gradient-border p-10 text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/15 transition-colors duration-500" />

            <Quote className="mx-auto mb-6 text-primary/40" size={36} />

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 + idx * 0.2, duration: 0.8 }}
              className="text-base md:text-lg text-white/80 leading-relaxed italic relative z-10"
            >
              {item.quote}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 + idx * 0.2, duration: 0.6 }}
              className="mt-6 flex items-center justify-center gap-4 relative z-10"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/30">
                {item.letter}
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">{item.name}</p>
                <p className="text-text-muted text-sm">{item.role}</p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
