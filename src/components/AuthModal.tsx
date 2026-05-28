import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Lock, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { verifySync } from 'otplib';

export default function AuthModal() {
  const { showAuth, setShowAuth, t, login, register, setPage } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(showAuth || 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingLogin, setPendingLogin] = useState<{ username: string; password: string; firebaseData: any; secret: string } | null>(null);

  if (!showAuth) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pendingLogin) {
      if (!twoFactorCode.trim()) {
        setError('Введите код 2FA');
        return;
      }
      const verifyResult = verifySync({ token: twoFactorCode.trim(), secret: pendingLogin.secret }) as { valid?: boolean };
      if (!verifyResult?.valid) {
        setError('Неверный код 2FA');
        return;
      }
      login(pendingLogin.username, pendingLogin.password, pendingLogin.firebaseData);
      setSuccess(true);
      setTimeout(() => {
        setPage('profile');
        setShowAuth(null);
        setSuccess(false);
        setPendingLogin(null);
        setTwoFactorCode('');
      }, 1200);
      return;
    }

    if (mode === 'register') {
      if (!username || !email || !password || !confirmPw) {
        setError(t.auth.fieldRequired);
        return;
      }
      if (password !== confirmPw) {
        setError(t.auth.passwordMismatch);
        return;
      }
      setLoading(true);
      try {
        const { ref, get, child, set } = await import('firebase/database');
        const { database } = await import('../utils/firebase');
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `users/${username}`));
        if (snapshot.exists()) {
          setError('логин занят');
          setLoading(false);
          return;
        }
        // Generate HWID and save to Firebase
        const hwid = generateHWIDLocal();
        await set(ref(database, `users/${username}`), {
          password: password,
          email: email,
          hwid: hwid
        });
        register(username, email, password, { hwid });
        setSuccess(true);
        setTimeout(() => {
          setPage('profile');
          setShowAuth(null);
          setSuccess(false);
        }, 1200);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!username || !password) {
        setError(t.auth.fieldRequired);
        return;
      }
      setLoading(true);
      try {
        const { ref, get, child } = await import('firebase/database');
        const { database } = await import('../utils/firebase');
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `users/${username}`));
        if (!snapshot.exists()) {
          setError('нету данного логина');
          setLoading(false);
          return;
        }
        const userData = snapshot.val();
        if (userData.password !== password) {
          setError('не верный пароль');
          setLoading(false);
          return;
        }

        // Check if user has a key and verify it in keys folder
        let keyData = null;
        if (userData.key) {
          const keySnapshot = await get(child(dbRef, `keys/${userData.key}`));
          if (keySnapshot.exists()) {
            keyData = keySnapshot.val();
          }
        }

        // Pass Firebase data (hwid, subscription info) to login
        const firebaseData: any = {};
        if (userData.hwid) firebaseData.hwid = userData.hwid;
        if (userData.key) firebaseData.key = userData.key;
        if (userData.email) firebaseData.email = userData.email;
        firebaseData.twoFactor = Boolean(userData.twoFactor);
        if (userData.twoFactorSecret) firebaseData.twoFactorSecret = userData.twoFactorSecret;

        // Use key data if available, otherwise use user's subscription data
        if (keyData) {
          firebaseData.subscription = keyData.subscription;
          firebaseData.expiresAt = keyData.expiresAt;
          firebaseData.plan = keyData.plan;
          firebaseData.days = keyData.days;
          firebaseData.duration = keyData.duration;
          firebaseData.durationDays = keyData.durationDays;
          firebaseData.duration_days = keyData.duration_days;
          firebaseData.validDays = keyData.validDays;
          firebaseData.valid_days = keyData.valid_days;
          firebaseData.createdAt = keyData.createdAt;
          firebaseData.activatedAt = keyData.activatedAt;
        } else {
          if (userData.subscription) firebaseData.subscription = userData.subscription;
          if (userData.expiresAt) firebaseData.expiresAt = userData.expiresAt;
          if (userData.plan) firebaseData.plan = userData.plan;
          if (userData.days) firebaseData.days = userData.days;
          if (userData.duration) firebaseData.duration = userData.duration;
          if (userData.durationDays) firebaseData.durationDays = userData.durationDays;
          if (userData.duration_days) firebaseData.duration_days = userData.duration_days;
          if (userData.validDays) firebaseData.validDays = userData.validDays;
          if (userData.valid_days) firebaseData.valid_days = userData.valid_days;
          if (userData.createdAt) firebaseData.createdAt = userData.createdAt;
          if (userData.activatedAt) firebaseData.activatedAt = userData.activatedAt;
        }

        if (userData.twoFactor && userData.twoFactorSecret) {
          setPendingLogin({
            username,
            password,
            firebaseData,
            secret: userData.twoFactorSecret,
          });
          setTwoFactorCode('');
          setLoading(false);
          return;
        }

        login(username, password, firebaseData);
        setSuccess(true);
        setTimeout(() => {
          setPage('profile');
          setShowAuth(null);
          setSuccess(false);
        }, 1200);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  function generateHWIDLocal() {
    const chars = 'ABCDEF0123456789';
    const parts = [];
    for (let i = 0; i < 4; i++) {
      let part = '';
      for (let j = 0; j < 4; j++) {
        part += chars[Math.floor(Math.random() * chars.length)];
      }
      parts.push(part);
    }
    return parts.join('-');
  }

  const switchMode = () => {
    setPendingLogin(null);
    setTwoFactorCode('');
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPw('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        onClick={() => setShowAuth(null)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gradient-border p-8 md:p-10 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-zinc-600/10 rounded-full blur-[60px]" />

            {/* Close */}
            <button
              onClick={() => setShowAuth(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Success state */}
            {success ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center py-10 relative z-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <CheckCircle2 className="text-green-400" size={64} />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-semibold text-white mt-4"
                >
                  {t.auth.success}
                </motion.p>
              </motion.div>
            ) : (
              <div className="relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center shadow-lg shadow-primary/30"
                  >
                    <Sparkles className="text-white" size={28} />
                  </motion.div>
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  {pendingLogin ? 'Подтвердите вход' : mode === 'login' ? t.auth.loginTitle : t.auth.registerTitle}
                </h2>

                {/* Tabs */}
                {!pendingLogin && (
                <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                  <button
                    onClick={() => mode !== 'login' && switchMode()}
                    className={`flex-1 py-2 text-sm rounded-lg transition-all duration-300 ${
                      mode === 'login' ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-muted'
                    }`}
                  >
                    {t.auth.login}
                  </button>
                  <button
                    onClick={() => mode !== 'register' && switchMode()}
                    className={`flex-1 py-2 text-sm rounded-lg transition-all duration-300 ${
                      mode === 'register' ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-muted'
                    }`}
                  >
                    {t.auth.register}
                  </button>
                </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {pendingLogin ? (
                    <div className="space-y-3">
                      <p className="text-sm text-text-muted">Введите 6-значный код из приложения Google Authenticator / Authy</p>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                  {/* Username */}
                  <div className="relative group">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder={t.auth.username}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-300"
                    />
                  </div>

                  {/* Email (register only) */}
                  <AnimatePresence>
                    {mode === 'register' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="relative group">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                          <input
                            type="email"
                            placeholder={t.auth.email}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-300"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                    </>
                  )}

                  {/* Password */}
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder={t.auth.password}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Confirm Password (register only) */}
                  <AnimatePresence>
                    {mode === 'register' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="relative group">
                          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                          <input
                            type="password"
                            placeholder={t.auth.confirmPassword}
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-300"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2"
                      >
                        <AlertCircle size={16} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 bg-gradient-to-r from-primary to-zinc-600 text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      mode === 'login' ? t.auth.login : t.auth.register
                    )}
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-text-muted text-xs">{t.auth.orContinue}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Social */}
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-muted hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    Discord
                  </button>
                  <a href="https://t.me/RainClient" target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-muted hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                    Telegram
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
