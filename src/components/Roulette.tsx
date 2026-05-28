import { useState, useRef, cloneElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gift, Star, Trophy, Crown, RefreshCw } from 'lucide-react';

const PRIZES = [
  {
    id: 0,
    label: 'Ничего',
    days: 0,
    color: 'from-zinc-800 to-zinc-900',
    bg: 'bg-zinc-900/80',
    border: 'border-zinc-700/50',
    icon: <Gift size={28} className="opacity-30" />,
    glow: 'rgba(0,0,0,0)',
    chance: 70,
  },
  {
    id: 1,
    label: '3 дня',
    days: 3,
    color: 'from-zinc-600 to-zinc-500',
    bg: 'bg-zinc-700/40',
    border: 'border-zinc-500/40',
    icon: <Zap size={28} />,
    glow: 'rgba(161,161,170,0.4)',
    chance: 15,
  },
  {
    id: 2,
    label: '1 неделя',
    days: 7,
    color: 'from-blue-700 to-blue-500',
    bg: 'bg-blue-900/30',
    border: 'border-blue-500/40',
    icon: <Star size={28} />,
    glow: 'rgba(59,130,246,0.4)',
    chance: 8,
  },
  {
    id: 3,
    label: '15 дней',
    days: 15,
    color: 'from-violet-700 to-violet-500',
    bg: 'bg-violet-900/30',
    border: 'border-violet-500/40',
    icon: <Trophy size={28} />,
    glow: 'rgba(139,92,246,0.4)',
    chance: 5,
  },
  {
    id: 4,
    label: '1 месяц',
    days: 30,
    color: 'from-amber-600 to-yellow-400',
    bg: 'bg-amber-900/20',
    border: 'border-amber-400/40',
    icon: <Crown size={28} />,
    glow: 'rgba(251,191,36,0.5)',
    chance: 2,
  },
];

// Build a strip: repeat prizes weighted by chance, total 40 items
function buildStrip(): typeof PRIZES {
  const strip: typeof PRIZES = [];
  for (let i = 0; i < 40; i++) {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const prize of PRIZES) {
      cumulative += prize.chance;
      if (rand < cumulative) {
        strip.push(prize);
        break;
      }
    }
  }
  return strip;
}

function pickPrize(): typeof PRIZES[0] {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const prize of PRIZES) {
    cumulative += prize.chance;
    if (rand < cumulative) return prize;
  }
  return PRIZES[0];
}

const CARD_W = 140; // px width of each card
const VISIBLE = 5;  // how many cards visible at once
const CENTER_IDX = Math.floor(VISIBLE / 2);

interface RouletteProps {
  lastSpinAt: string;
  onWin: (prize: typeof PRIZES[0]) => void;
}

export default function Roulette({ lastSpinAt, onWin }: RouletteProps) {
  const canSpin = !lastSpinAt || (Date.now() - new Date(lastSpinAt).getTime()) >= 24 * 60 * 60 * 1000;
  const timeUntilNext = lastSpinAt
    ? Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - new Date(lastSpinAt).getTime()))
    : 0;

  const hh = Math.floor(timeUntilNext / 3600000);
  const mm = Math.floor((timeUntilNext % 3600000) / 60000);
  const ss = Math.floor((timeUntilNext % 60000) / 1000);

  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<typeof PRIZES>(() => buildStrip());
  const [offset, setOffset] = useState(0);
  const [wonPrize, setWonPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spin = () => {
    if (!canSpin || spinning) return;
    setShowResult(false);
    setWonPrize(null);

    const newStrip = buildStrip();
    const winner = pickPrize();
    // Place winner at the center of the strip
    const winnerIdx = 30; // second half so scroll is smooth
    newStrip[winnerIdx] = winner;
    setStrip(newStrip);

    // We want the winnerIdx card to be centered → offset = winnerIdx - CENTER_IDX
    const targetOffset = (winnerIdx - CENTER_IDX) * CARD_W;
    setOffset(0); // reset
    setSpinning(true);

    // After reset, animate to target
    setTimeout(() => {
      setOffset(targetOffset);
    }, 50);

    // After animation ends (3s)
    animRef.current = setTimeout(() => {
      setSpinning(false);
      setWonPrize(winner);
      setShowResult(true);
      onWin(winner);
    }, 3500);
  };

  return (
    <div className="gradient-border p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />

      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Gift size={18} className="text-primary" />
        Ежедневная рулетка
      </h3>
      <p className="text-text-muted text-xs mb-5">
        Крути раз в день — выиграй продление подписки!
      </p>

      {/* Prize legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PRIZES.map((p) => (
          <div key={p.id} className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${p.bg} border ${p.border} text-xs`}>
            <span className="text-white/80 flex items-center justify-center">
              {p.icon && cloneElement(p.icon, { size: 14 } as { size: number })}
            </span>
            <span className="text-white font-medium">{p.label}</span>
            <span className="text-white/40 text-[10px]">{p.chance}%</span>
          </div>
        ))}
      </div>

      {/* Roulette strip container */}
      <div className="relative mb-5" style={{ height: 160 }}>
        {/* Center highlight */}
        <div
          className="absolute top-0 bottom-0 z-10 pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            width: CARD_W + 8,
            borderLeft: '2px solid rgba(255,255,255,0.25)',
            borderRight: '2px solid rgba(255,255,255,0.25)',
            boxShadow: '0 0 20px rgba(255,255,255,0.05)',
          }}
        />
        {/* Left/right fades */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-bg-card to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-bg-card to-transparent z-10 pointer-events-none" />

        <div
          className="absolute inset-0 overflow-hidden flex items-center"
        >
          <motion.div
            className="flex gap-3 absolute"
            style={{ left: `calc(50% - ${CENTER_IDX * (CARD_W + 12)}px - ${CARD_W / 2}px)` }}
            animate={{ x: -offset }}
            transition={spinning ? { duration: 3, ease: [0.2, 0.8, 0.4, 1] } : { duration: 0 }}
          >
            {strip.map((prize, idx) => (
              <div
                key={idx}
                className={`flex-shrink-0 rounded-2xl border ${prize.border} ${prize.bg} flex flex-col items-center justify-center gap-2 select-none`}
                style={{ width: CARD_W, height: 140 }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${prize.color} flex items-center justify-center text-white shadow-lg`}>
                  {prize.icon}
                </div>
                <p className="text-white font-bold text-sm">{prize.label}</p>
                <p className="text-white/40 text-[10px]">клиент</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Spin button */}
      {canSpin ? (
        <motion.button
          onClick={spin}
          disabled={spinning}
          whileHover={!spinning ? { scale: 1.03, boxShadow: '0 0 30px rgba(139,92,246,0.4)' } : {}}
          whileTap={!spinning ? { scale: 0.97 } : {}}
          className="w-full py-3 bg-gradient-to-r from-primary to-zinc-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
        >
          {spinning ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}>
                <RefreshCw size={18} />
              </motion.div>
              Крутится...
            </>
          ) : (
            <>
              <Gift size={18} />
              Крутить рулетку!
            </>
          )}
        </motion.button>
      ) : (
        <div className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-center text-text-muted text-sm">
          Следующий спин через{' '}
          <span className="text-white font-mono font-semibold">
            {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Win popup */}
      <AnimatePresence>
        {showResult && wonPrize && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', damping: 15 }}
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl ${wonPrize.bg} border ${wonPrize.border} backdrop-blur-sm z-20`}
            style={{ boxShadow: `0 0 60px ${wonPrize.glow}` }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6 }}
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${wonPrize.color} flex items-center justify-center text-white shadow-2xl mb-4`}
            >
              {wonPrize.icon}
            </motion.div>
            <p className="text-white/60 text-sm mb-1">{wonPrize.days > 0 ? 'Поздравляем!' : 'Увы...'}</p>
            <p className="text-white text-2xl font-bold mb-1">{wonPrize.label}</p>
            {wonPrize.days > 0 ? (
              <p className="text-white/50 text-xs mb-4">подписки добавлено к аккаунту</p>
            ) : (
              <p className="text-white/50 text-xs mb-4">повезет в следующий раз</p>
            )}
            <button
              onClick={() => setShowResult(false)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm rounded-xl transition-colors"
            >
              Закрыть
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
