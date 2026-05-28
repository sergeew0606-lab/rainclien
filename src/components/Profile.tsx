import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, BarChart3, Settings, Cloud, Copy, Check,
  Calendar, Hash, Mail, Clock, Cpu, ChevronRight,
  Download, Trash2, Share2, Crown, Zap, ArrowLeft,
  Activity, Lock, Smartphone, RefreshCw, Star, AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Roulette from './Roulette';

export default function Profile() {
  const { user, t, setPage, logout, setShowPurchase, downloadLoader, spinRoulette, applySubscriptionKey } = useApp();
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'configs' | 'security' | 'stats'>('info');
  const [subscriptionKey, setSubscriptionKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  if (!user) return null;

  const copyHwid = () => {
    navigator.clipboard.writeText(user.hwid);
    setCopiedHwid(true);
    setTimeout(() => setCopiedHwid(false), 2000);
  };

  const hasSub = user.subscription.status === 'active';
  const isLifetime = user.subscription.plan === 'lifetime' && String(user.subscription.expiresAt) === '∞';
  const daysLeft = isLifetime
    ? Infinity
    : user.subscription.expiresAt !== '-' && user.subscription.expiresAt !== '∞'
      ? Math.max(0, Math.floor((new Date(user.subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;
  const expiresAtLabel = user.subscription.expiresAt !== '-' && user.subscription.expiresAt !== '∞'
    ? new Date(user.subscription.expiresAt).toLocaleDateString('ru-RU')
    : user.subscription.expiresAt;

  const basePlanLabel = user.subscription.plan === 'month'
    ? t.purchase.month
    : user.subscription.plan === 'week'
      ? '7 дней'
    : user.subscription.plan === 'year'
      ? '365 дней'
      : user.subscription.plan === 'half_year'
        ? '180 дней'
      : user.subscription.plan === 'lifetime'
        ? t.purchase.lifetime
        : t.profile.noSub;

  const basePlanDurationDays = user.subscription.plan === 'week'
    ? 7
    : user.subscription.plan === 'half_year'
      ? 180
      : user.subscription.plan === 'year'
        ? 365
        : user.subscription.plan === 'month'
          ? 30
          : Math.max(1, daysLeft || 1);

  const planLabel = hasSub && !isLifetime
    ? `${daysLeft} дней`
    : basePlanLabel;

  const planDurationDays = hasSub && !isLifetime
    ? Math.max(basePlanDurationDays, daysLeft || 1)
    : basePlanDurationDays;

  const tabs = [
    { id: 'info' as const, icon: <User size={18} />, label: t.profile.userInfo },
    { id: 'stats' as const, icon: <BarChart3 size={18} />, label: t.profile.stats },
    { id: 'configs' as const, icon: <Cloud size={18} />, label: t.profile.configs },
    { id: 'security' as const, icon: <Shield size={18} />, label: t.profile.security },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
  };

  const handleApplyKey = async () => {
    setKeyStatus(null);
    setKeyLoading(true);
    const result = await applySubscriptionKey(subscriptionKey);
    setKeyStatus({ type: result.ok ? 'success' : 'error', text: result.message });
    if (result.ok) setSubscriptionKey('');
    setKeyLoading(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 grid-bg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage('home')}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{t.profile.title}</h1>
              <p className="text-text-muted text-sm">rainclient dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasSub && (
              <motion.button
                onClick={downloadLoader}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/20"
              >
                <Download size={16} />
                {t.profile.downloadLoader}
              </motion.button>
            )}
            <button
              onClick={logout}
              className="text-sm text-red-400 hover:text-red-300 transition-colors bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl"
            >
              {t.nav.logout}
            </button>
          </div>
        </motion.div>

        {/* User Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="gradient-border p-6 md:p-8 mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-primary/30 relative"
            >
              {user.username[0].toUpperCase()}
              {hasSub && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-bg-card flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-white">{user.username}</h2>
                {hasSub ? (
                  <span className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded-full text-xs text-primary-light flex items-center gap-1">
                    <Crown size={12} />
                    {planLabel}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {t.profile.noSub}
                  </span>
                )}
              </div>
              <p className="text-text-muted text-sm">{user.email}</p>
              <p className="text-text-muted/60 text-xs mt-1">UID: #{user.uid} · {t.profile.regDate}: {user.regDate}</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {!hasSub && (
                <motion.button
                  onClick={() => setShowPurchase(true)}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary to-zinc-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/25"
                >
                  {t.profile.buyNow}
                </motion.button>
              )}
              {hasSub && (
                <motion.button
                  onClick={downloadLoader}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="sm:hidden px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/20 flex items-center gap-2"
                >
                  <Download size={16} />
                  Loader
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
              >
                {t.profile.editProfile}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-primary/20 text-white border border-primary/30 shadow-lg shadow-primary/10'
                  : 'bg-white/5 text-text-muted border border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {activeTab === 'info' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* User Details */}
              <motion.div variants={itemVariants} className="gradient-border p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-[80px]" />
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
                  <User size={18} className="text-primary" />
                  {t.profile.userInfo}
                </h3>
                <div className="space-y-4 relative z-10">
                  <InfoRow icon={<User size={16} />} label={t.profile.login} value={user.username} />
                  <InfoRow icon={<Mail size={16} />} label={t.profile.email} value={user.email} />
                  <InfoRow icon={<Hash size={16} />} label={t.profile.uid} value={`#${user.uid}`} />
                  <InfoRow icon={<Calendar size={16} />} label={t.profile.regDate} value={user.regDate} />
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <div className="flex items-center gap-3 text-text-muted">
                      <Cpu size={16} />
                      <span className="text-sm">{t.profile.hwid}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded font-mono">{user.hwid}</code>
                      <button onClick={copyHwid} className="text-text-muted hover:text-white transition-colors">
                        {copiedHwid ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button className="mt-4 text-xs text-primary-light hover:text-white transition-colors flex items-center gap-1">
                  <RefreshCw size={12} />
                  {t.profile.resetHwid}
                </button>
              </motion.div>

              {/* Subscription */}
              <motion.div variants={itemVariants} className="gradient-border p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-600/5 rounded-full blur-[80px]" />
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
                  <Crown size={18} className="text-primary" />
                  {t.profile.subscription}
                </h3>
                <div className="relative z-10">
                  {hasSub ? (
                    <>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center shadow-lg shadow-primary/20">
                          <Zap size={28} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{planLabel}</p>
                          <p className="text-sm flex items-center gap-1 text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            {t.profile.active}
                          </p>
                        </div>
                      </div>

                      {!isLifetime && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-text-muted">{t.profile.expiresAt}</span>
                            <span className="text-white font-medium">{expiresAtLabel}</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (daysLeft / planDurationDays) * 100)}%` }}
                              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-primary to-zinc-600 rounded-full"
                            />
                          </div>
                          <p className="text-xs text-text-muted mt-1">{daysLeft} {t.profile.daysLeft}</p>
                        </div>
                      )}

                      {isLifetime && (
                        <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                          <Crown size={20} className="text-amber-400" />
                          <div>
                            <p className="text-sm font-semibold text-amber-400">{t.profile.forever}</p>
                            <p className="text-xs text-text-muted">∞</p>
                          </div>
                        </div>
                      )}

                      {/* Daily Roulette - only for subscribed users */}
                      {hasSub && (
                        <div className="mb-4">
                          <Roulette
                            lastSpinAt={user.lastRewardAt || ''}
                            onWin={(prize) => spinRoulette(prize.days)}
                          />
                        </div>
                      )}
                      {/* Download Loader Button */}
                      <motion.button
                        onClick={downloadLoader}
                        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(34,197,94,0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 mb-3"
                      >
                        <Download size={18} />
                        {t.profile.downloadLoader}
                      </motion.button>

                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => setShowPurchase(true)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
                        >
                          {t.profile.renewSub}
                        </motion.button>
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-text-muted">Активация ключа</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={subscriptionKey}
                            onChange={(e) => setSubscriptionKey(e.target.value)}
                            placeholder="Введите ключ"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 transition-all"
                          />
                          <motion.button
                            onClick={handleApplyKey}
                            disabled={keyLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2.5 bg-primary/20 border border-primary/30 text-white text-sm font-medium rounded-xl disabled:opacity-60"
                          >
                            {keyLoading ? 'Проверка...' : 'Проверить'}
                          </motion.button>
                        </div>
                        {keyStatus && (
                          <p className={`text-xs ${keyStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {keyStatus.text}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} className="text-amber-400" />
                      </div>
                      <p className="text-white font-semibold mb-2">{t.profile.noSub}</p>
                      <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">{t.profile.noSubDesc}</p>
                      <motion.button
                        onClick={() => setShowPurchase(true)}
                        whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
                        whileTap={{ scale: 0.97 }}
                        className="px-8 py-3 bg-gradient-to-r from-primary to-zinc-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 flex items-center gap-2 mx-auto"
                      >
                        <Crown size={18} />
                        {t.profile.upgradePlan}
                      </motion.button>
                      <div className="mt-5 space-y-2 text-left max-w-sm mx-auto">
                        <p className="text-xs text-text-muted">Есть ключ? Активируйте здесь</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={subscriptionKey}
                            onChange={(e) => setSubscriptionKey(e.target.value)}
                            placeholder="Введите ключ"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 transition-all"
                          />
                          <motion.button
                            onClick={handleApplyKey}
                            disabled={keyLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2.5 bg-primary/20 border border-primary/30 text-white text-sm font-medium rounded-xl disabled:opacity-60"
                          >
                            {keyLoading ? 'Проверка...' : 'Проверить'}
                          </motion.button>
                        </div>
                        {keyStatus && (
                          <p className={`text-xs ${keyStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {keyStatus.text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div variants={itemVariants} className="gradient-border p-6 md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  {t.profile.activity}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard icon={<Clock size={20} />} value={user.stats.hoursPlayed.toString()} label={t.profile.hoursPlayed} color="from-violet-500 to-zinc-600" />
                  <StatCard icon={<BarChart3 size={20} />} value={user.stats.sessions.toString()} label={t.profile.sessions} color="from-zinc-500 to-fuchsia-600" />
                  <StatCard icon={<Cloud size={20} />} value={user.stats.configsSaved.toString()} label={t.profile.configsSaved} color="from-fuchsia-500 to-pink-600" />
                  <StatCard icon={<Star size={20} />} value={user.stats.serversPlayed.toString()} label={t.profile.serversPlayed} color="from-pink-500 to-rose-600" />
                </div>

                {/* Activity Chart */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <div className="flex items-end gap-2 h-32">
                    {user.activity.map((v, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${v === 0 ? 5 : (v / 8) * 100}%` }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 bg-gradient-to-t from-primary/40 to-primary rounded-t-md relative group cursor-pointer"
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-card border border-white/10 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {v}h
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => (
                      <div key={i} className="flex-1 text-center text-xs text-text-muted">{d}</div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="gradient-border p-6 text-center md:col-span-3">
                <h3 className="text-lg font-semibold text-white mb-8">{t.profile.stats}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <BigStat value="347" label="PvP Kills" icon={<Zap size={24} />} />
                  <BigStat value="89%" label="Win Rate" icon={<Star size={24} />} />
                  <BigStat value="1.2K" label="Blocks Placed" icon={<Settings size={24} />} />
                  <BigStat value="56" label="Tournaments" icon={<Crown size={24} />} />
                  <BigStat value="4.8" label="K/D Ratio" icon={<Activity size={24} />} />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="gradient-border p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-primary" />
                  Anti-Cheat Bypasses
                </h4>
                <div className="space-y-3">
                  {[
                    { name: 'Vulcan', pct: 99 },
                    { name: 'Grim', pct: 97 },
                    { name: 'Matrix', pct: 100 },
                    { name: 'Polar', pct: 95 },
                    { name: 'Intave', pct: 98 },
                  ].map((ac) => (
                    <div key={ac.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-muted">{ac.name}</span>
                        <span className="text-green-400">{ac.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ac.pct}%` }}
                          transition={{ delay: 0.5, duration: 1 }}
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="gradient-border p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  Top Servers
                </h4>
                <div className="space-y-3">
                  {[
                    { name: 'mc.hypixel.net', hours: 89 },
                    { name: 'funtime.su', hours: 45 },
                    { name: 'mineblaze.net', hours: 32 },
                    { name: 'vimeworld.com', hours: 21 },
                    { name: 'mc.reallyworld.ru', hours: 15 },
                  ].map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-5">#{i + 1}</span>
                        <span className="text-sm text-white">{s.name}</span>
                      </div>
                      <span className="text-xs text-text-muted">{s.hours}h</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="gradient-border p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  {t.profile.lastSession}
                </h4>
                <div className="space-y-3">
                  <InfoRow icon={<Calendar size={14} />} label="Date" value={user.stats.lastSession} />
                  <InfoRow icon={<Clock size={14} />} label="Duration" value="2h 34m" />
                  <InfoRow icon={<Star size={14} />} label="Server" value="mc.hypixel.net" />
                  <InfoRow icon={<Zap size={14} />} label="Kills" value="23" />
                  <InfoRow icon={<Shield size={14} />} label="Deaths" value="5" />
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'configs' && (
            <div className="space-y-4">
              {user.configs.length === 0 && (
                <motion.div variants={itemVariants} className="gradient-border p-10 text-center">
                  <Cloud size={48} className="text-text-muted mx-auto mb-4" />
                  <p className="text-white font-semibold mb-2">Нет конфигов</p>
                  <p className="text-text-muted text-sm">
                    {hasSub ? 'Создайте свой первый конфиг' : 'Приобретите подписку для доступа к конфигам'}
                  </p>
                </motion.div>
              )}
              {user.configs.map((cfg, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="gradient-border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Settings size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{cfg.name}</p>
                      <p className="text-text-muted text-sm flex items-center gap-2">
                        <span>{cfg.server}</span>
                        <span className="text-text-muted/40">·</span>
                        <span>{cfg.date}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary-light hover:bg-primary/20 transition-colors"
                      title={t.profile.configLoad}
                    >
                      <Download size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                      title={t.profile.configShare}
                    >
                      <Share2 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                      title={t.profile.configDelete}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}

              {hasSub && (
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  className="w-full gradient-border p-5 text-center text-text-muted hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Cloud size={18} />
                  + Создать конфиг
                </motion.button>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="gradient-border p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  {t.profile.changePassword}
                </h3>
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="Текущий пароль"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Новый пароль"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Подтвердите новый пароль"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-primary to-zinc-600 text-white text-sm font-medium rounded-xl"
                  >
                    {t.profile.changePassword}
                  </motion.button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-6">
                <div className="gradient-border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-primary" />
                    {t.profile.twoFactor}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${user.twoFactor ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                      <span className={`text-sm ${user.twoFactor ? 'text-green-400' : 'text-red-400'}`}>
                        {user.twoFactor ? t.profile.enabled : t.profile.disabled}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary-light text-sm hover:bg-primary/20 transition-colors"
                    >
                      {user.twoFactor ? t.profile.disable : t.profile.enable}
                    </motion.button>
                  </div>
                </div>

                <div className="gradient-border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Smartphone size={18} className="text-primary" />
                    {t.profile.activeDevices}
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Windows 11 — Chrome', date: 'Active now', active: true },
                      { name: 'Windows 10 — Minecraft', date: '2 hours ago', active: false },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <Cpu size={16} className="text-text-muted" />
                          <div>
                            <p className="text-sm text-white">{d.name}</p>
                            <p className="text-xs text-text-muted">{d.date}</p>
                          </div>
                        </div>
                        {d.active ? (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <button className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div className="flex items-center gap-3 text-text-muted">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center cursor-default"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mx-auto mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </motion.div>
  );
}

function BigStat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="text-center cursor-default"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-3">
        {icon}
      </div>
      <motion.p
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="text-3xl font-bold text-white"
      >
        {value}
      </motion.p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </motion.div>
  );
}
