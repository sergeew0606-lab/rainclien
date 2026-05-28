import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Crown, Zap, Star, Download,
  Shield, Cloud, MessageCircle, Code, Clock,
  Sparkles, Rocket, ChevronRight, Tag, Percent, BadgeCheck, XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

type Plan = 'month' | 'year' | 'lifetime';

interface PromoCode {
  code: string;
  discount: number; // percentage 0-100
  label: string;
}

const PROMO_CODES: PromoCode[] = [
  { code: 'RAINCLIENT50', discount: 50, label: '50% OFF' },
  { code: 'WELCOME', discount: 25, label: '25% OFF' },
];

const BASE_PRICES: Record<Plan, number> = {
  month: 170,
  year: 250,
  lifetime: 399,
};

export default function PurchaseModal() {
  const { showPurchase, setShowPurchase, t, downloadLoader, user } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('lifetime');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoShake, setPromoShake] = useState(false);

  useEffect(() => {
    if (promoError) {
      setPromoShake(true);
      const timer = setTimeout(() => { setPromoShake(false); setPromoError(false); }, 1500);
      return () => clearTimeout(timer);
    }
  }, [promoError]);

  useEffect(() => {
    if (promoSuccess) {
      const timer = setTimeout(() => setPromoSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [promoSuccess]);

  // Check payment status when modal opens
  useEffect(() => {
    if (showPurchase) {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      
      if (paymentStatus === 'checking') {
        setCheckingPayment(true);
        setPaymentFailed(false);
        setSuccess(false);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'fail') {
        setCheckingPayment(false);
        setPaymentFailed(true);
        setSuccess(false);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'success') {
        setCheckingPayment(false);
        setPaymentFailed(false);
        setSuccess(true);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [showPurchase]);

  if (!showPurchase) return null;

  const getDiscountedPrice = (base: number) => {
    if (!appliedPromo) return base;
    return Math.round(base * (1 - appliedPromo.discount / 100));
  };

  const handleApplyPromo = () => {
    const trimmed = promoInput.trim();
    if (!trimmed) return;
    const found = PROMO_CODES.find(
      (p) => p.code.toLowerCase() === trimmed.toLowerCase()
    );
    if (found) {
      setAppliedPromo(found);
      setPromoError(false);
      setPromoSuccess(true);
    } else {
      setPromoError(true);
      setPromoSuccess(false);
      setAppliedPromo(null);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(false);
    setPromoSuccess(false);
  };

  const formatPrice = (price: number) => `${price} ₽`;

  const plans = [
    {
      id: 'month' as Plan,
      name: t.purchase.month,
      basePrice: BASE_PRICES.month,
      price: formatPrice(getDiscountedPrice(BASE_PRICES.month)),
      originalPrice: appliedPromo ? formatPrice(BASE_PRICES.month) : null,
      period: t.purchase.perMonth,
      desc: t.purchase.monthDesc,
      icon: <Zap size={24} />,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      features: [t.purchase.f1, t.purchase.f2, t.purchase.f3, t.purchase.f4, t.purchase.f5],
      badge: null,
    },
    {
      id: 'year' as Plan,
      name: t.purchase.halfYear, // Will change text in i18n
      basePrice: BASE_PRICES.year,
      price: formatPrice(getDiscountedPrice(BASE_PRICES.year)),
      originalPrice: appliedPromo ? formatPrice(BASE_PRICES.year) : null,
      period: t.purchase.perHalfYear, // Will change text in i18n
      desc: t.purchase.halfYearDesc, // Will change text in i18n
      icon: <Star size={24} />,
      color: 'from-primary to-zinc-600',
      shadow: 'shadow-primary/20',
      border: 'border-primary/30',
      bg: 'bg-primary/10',
      features: [t.purchase.f1, t.purchase.f2, t.purchase.f3, t.purchase.f4, t.purchase.f5, t.purchase.f6, t.purchase.f7],
      badge: t.purchase.popular,
    },
    {
      id: 'lifetime' as Plan,
      name: t.purchase.lifetime,
      basePrice: BASE_PRICES.lifetime,
      price: formatPrice(getDiscountedPrice(BASE_PRICES.lifetime)),
      originalPrice: appliedPromo ? formatPrice(BASE_PRICES.lifetime) : null,
      period: t.purchase.oneTime,
      desc: t.purchase.lifetimeDesc,
      icon: <Crown size={24} />,
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      features: [t.purchase.f1, t.purchase.f2, t.purchase.f3, t.purchase.f4, t.purchase.f5, t.purchase.f6, t.purchase.f7, t.purchase.f8, t.purchase.f9, t.purchase.f10],
      badge: t.purchase.best,
    },
  ];

  const handlePurchase = () => {
    if (!user) return;
    setProcessing(true);

    const wallet = '4100119541070621'; // From user screenshot
    const currentPlanObj = plans.find((p) => p.id === selectedPlan)!;
    const amount = getDiscountedPrice(currentPlanObj.basePrice);

    // Save pending purchase info
    localStorage.setItem('pending_purchase_plan', selectedPlan);

    // Show checking payment screen first
    setCheckingPayment(true);
    setProcessing(false);

    // Redirect to YooMoney after a short delay
    setTimeout(() => {
      const returnUrl = encodeURIComponent(window.location.origin + '?payment=success');
      const failUrl = encodeURIComponent(window.location.origin + '?payment=fail');
      const paymentUrl = `https://yoomoney.ru/quickpay/confirm.xml?receiver=${wallet}&quickpay-form=shop&targets=RainClient%20Subscription%20(${selectedPlan})%20-%20${user.username}&paymentType=AC&sum=${amount}&successURL=${returnUrl}&failURL=${failUrl}`;

      window.location.href = paymentUrl;
    }, 1500);
  };

  const handleClose = () => {
    setShowPurchase(false);
    setSuccess(false);
    setCheckingPayment(false);
    setPaymentFailed(false);
    setSelectedPlan('lifetime');
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(false);
    setPromoSuccess(false);
  };

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;
  const finalPrice = getDiscountedPrice(currentPlan.basePrice);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 overflow-y-auto"
        onClick={handleClose}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 60 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 60 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {checkingPayment ? (
            <div className="gradient-border p-8 md:p-12 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="flex flex-col items-center py-8 relative z-10"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/30">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Clock size={48} className="text-white" />
                  </motion.div>
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white mb-3"
                >
                  Проверка оплаты
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-text-muted text-center max-w-md mb-8"
                >
                  Пожалуйста, подождите. Мы проверяем статус вашей оплаты...
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 text-blue-400 text-sm"
                >
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                  />
                  <span>Обработка платежа</span>
                </motion.div>
              </motion.div>
            </div>
          ) : paymentFailed ? (
            <div className="gradient-border p-8 md:p-12 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-red-500/10 rounded-full blur-[120px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />

              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="flex flex-col items-center py-8 relative z-10"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/30">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                  >
                    <XCircle size={48} className="text-white" />
                  </motion.div>
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-bold text-white mb-3"
                >
                  Оплата не прошла
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-text-muted text-center max-w-md mb-8"
                >
                  К сожалению, оплата не была завершена. Пожалуйста, попробуйте снова или выберите другой способ оплаты.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <motion.button
                    onClick={() => {
                      setPaymentFailed(false);
                    }}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 bg-gradient-to-r from-primary to-zinc-600 text-white font-semibold rounded-full text-sm flex items-center gap-2 shadow-xl shadow-primary/25"
                  >
                    <Sparkles size={18} />
                    Попробовать снова
                  </motion.button>
                  <motion.button
                    onClick={handleClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 bg-white/5 border border-white/10 text-white/80 font-medium rounded-full text-sm"
                  >
                    {t.purchase.close}
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          ) : success ? (
            <div className="gradient-border p-8 md:p-12 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-green-500/10 rounded-full blur-[120px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />

              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="flex flex-col items-center py-8 relative z-10"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6 shadow-2xl shadow-green-500/30">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                  >
                    <Check size={48} className="text-white" />
                  </motion.div>
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-bold text-white mb-3"
                >
                  {t.purchase.successTitle}
                </motion.h2>

                {appliedPromo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 }}
                    className="flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20"
                  >
                    <Tag size={14} className="text-green-400" />
                    <span className="text-green-400 text-sm font-medium">
                      {t.purchase.promo}: «{appliedPromo.code}» — {appliedPromo.label}
                    </span>
                  </motion.div>
                )}

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-text-muted text-center max-w-md mb-8"
                >
                  {t.purchase.successDesc}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <motion.button
                    onClick={() => {
                      downloadLoader();
                      handleClose();
                    }}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 bg-gradient-to-r from-primary to-zinc-600 text-white font-semibold rounded-full text-sm flex items-center gap-2 shadow-xl shadow-primary/25"
                  >
                    <Download size={18} />
                    {t.purchase.downloadNow}
                  </motion.button>
                  <motion.button
                    onClick={handleClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 bg-white/5 border border-white/10 text-white/80 font-medium rounded-full text-sm"
                  >
                    {t.purchase.close}
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          ) : (
            <div className="gradient-border p-6 md:p-10 relative overflow-hidden">
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/8 rounded-full blur-[150px]" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zinc-600/8 rounded-full blur-[120px]" />

              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-zinc-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30"
                  >
                    <Sparkles className="text-white" size={28} />
                  </motion.div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{t.purchase.title}</h2>
                  <p className="text-text-muted">{t.purchase.subtitle}</p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-8">
                  {plans.map((plan, i) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-500 group ${
                        selectedPlan === plan.id
                          ? `bg-white/[0.06] border-2 ${plan.border} ${plan.shadow} shadow-lg`
                          : 'bg-white/[0.02] border-2 border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Badge */}
                      {plan.badge && (
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${plan.color} shadow-lg ${plan.shadow}`}
                        >
                          {plan.badge}
                        </div>
                      )}

                      {/* Discount badge */}
                      {appliedPromo && (
                        <motion.div
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: -12 }}
                          className="absolute -top-2 -right-2 z-10"
                        >
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg shadow-green-500/30 flex items-center gap-1">
                            <Percent size={10} />
                            -{appliedPromo.discount}%
                          </div>
                        </motion.div>
                      )}

                      {/* Selection indicator */}
                      <div
                        className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          selectedPlan === plan.id
                            ? `${plan.border} bg-gradient-to-br ${plan.color}`
                            : 'border-white/20'
                        }`}
                      >
                        {selectedPlan === plan.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                          >
                            <Check size={10} className="text-white" />
                          </motion.div>
                        )}
                      </div>

                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-4 shadow-lg ${plan.shadow} transition-transform duration-300 group-hover:scale-110`}
                      >
                        {plan.icon}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-text-muted text-xs mb-4">{plan.desc}</p>

                      {/* Price */}
                      <div className="mb-5">
                        {plan.originalPrice && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-lg text-text-muted line-through mr-2"
                          >
                            {plan.originalPrice}
                          </motion.span>
                        )}
                        <motion.span
                          key={plan.price}
                          initial={appliedPromo ? { scale: 1.3, color: '#4ade80' } : {}}
                          animate={{ scale: 1, color: appliedPromo ? '#4ade80' : '#ffffff' }}
                          transition={{ duration: 0.4 }}
                          className="text-3xl md:text-4xl font-black"
                        >
                          {plan.price}
                        </motion.span>
                        <span className="text-text-muted text-sm ml-1">{plan.period}</span>
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5">
                        {plan.features.map((f, fi) => (
                          <div key={fi} className="flex items-start gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0 mt-0.5`}
                            >
                              <Check size={8} className="text-white" />
                            </div>
                            <span className="text-sm text-text-muted">{f}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ======= PROMO CODE SECTION ======= */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="mb-8"
                >
                  <div className="gradient-border p-5 md:p-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-[60px]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <Tag size={18} className="text-primary" />
                        <h3 className="text-white font-bold text-sm">{t.purchase.promo}</h3>
                        {appliedPromo && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1.5 ml-auto"
                          >
                            <BadgeCheck size={16} className="text-green-400" />
                            <span className="text-green-400 text-xs font-semibold">
                              {appliedPromo.label}
                            </span>
                          </motion.div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                          <motion.div
                            animate={promoShake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                            transition={{ duration: 0.5 }}
                            className="relative"
                          >
                            <input
                              type="text"
                              value={promoInput}
                              onChange={(e) => {
                                setPromoInput(e.target.value);
                                setPromoError(false);
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                              placeholder={t.purchase.promoPlaceholder}
                              disabled={!!appliedPromo}
                              className={`w-full px-4 py-3 bg-white/[0.04] border-2 rounded-xl text-white text-sm placeholder-white/30 outline-none transition-all duration-300 ${
                                promoError
                                  ? 'border-red-500/50 bg-red-500/5'
                                  : appliedPromo
                                  ? 'border-green-500/30 bg-green-500/5'
                                  : 'border-white/10 focus:border-primary/50'
                              } disabled:opacity-60`}
                            />
                            {/* Status icon */}
                            <AnimatePresence>
                              {promoError && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0 }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                  <XCircle size={18} className="text-red-400" />
                                </motion.div>
                              )}
                              {appliedPromo && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0 }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                  <BadgeCheck size={18} className="text-green-400" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Error message */}
                          <AnimatePresence>
                            {promoError && (
                              <motion.p
                                initial={{ opacity: 0, y: -5, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -5, height: 0 }}
                                className="text-red-400 text-xs mt-1.5 ml-1"
                              >
                                {t.purchase.promoInvalid}
                              </motion.p>
                            )}
                          </AnimatePresence>

                          {/* Success message */}
                          <AnimatePresence>
                            {promoSuccess && appliedPromo && (
                              <motion.p
                                initial={{ opacity: 0, y: -5, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -5, height: 0 }}
                                className="text-green-400 text-xs mt-1.5 ml-1 flex items-center gap-1"
                              >
                                <Sparkles size={12} />
                                {t.purchase.promoApplied} {t.purchase.promoDiscount}: {appliedPromo.discount}%
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {appliedPromo ? (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={handleRemovePromo}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-xl text-sm hover:bg-red-500/15 transition-colors flex items-center gap-2"
                          >
                            <X size={14} />
                            {t.purchase.promoRemove}
                          </motion.button>
                        ) : (
                          <motion.button
                            onClick={handleApplyPromo}
                            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-gradient-to-r from-primary/20 to-zinc-600/20 border border-primary/30 text-primary font-semibold rounded-xl text-sm hover:from-primary/30 hover:to-zinc-600/30 transition-all flex items-center gap-2"
                          >
                            <Tag size={14} />
                            {t.purchase.promoApply}
                          </motion.button>
                        )}
                      </div>

                      {/* Price summary with promo */}
                      <AnimatePresence>
                        {appliedPromo && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-white/5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-4">
                                <div className="text-sm">
                                  <span className="text-text-muted">{t.purchase.oldPrice}: </span>
                                  <span className="text-white/50 line-through">{formatPrice(currentPlan.basePrice)}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-text-muted">{t.purchase.promoDiscount}: </span>
                                  <span className="text-green-400 font-semibold">-{appliedPromo.discount}%</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-text-muted text-sm">{t.purchase.newPrice}:</span>
                                <motion.span
                                  key={finalPrice}
                                  initial={{ scale: 1.5, color: '#4ade80' }}
                                  animate={{ scale: 1, color: '#4ade80' }}
                                  className="text-2xl font-black"
                                >
                                  {finalPrice === 0 ? 'FREE!' : formatPrice(finalPrice)}
                                </motion.span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Features Row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
                >
                  {[
                    { icon: <Shield size={16} />, label: 'Anti-cheat bypass' },
                    { icon: <Cloud size={16} />, label: 'Cloud configs' },
                    { icon: <Code size={16} />, label: 'LUA scripting' },
                    { icon: <MessageCircle size={16} />, label: '24/7 Support' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5"
                    >
                      <span className="text-primary">{item.icon}</span>
                      <span className="text-xs text-text-muted">{item.label}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Purchase Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Clock size={14} />
                      <span>Мгновенная активация</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Rocket size={14} />
                      <span>Авто-обновления</span>
                    </div>
                  </div>

                  <motion.button
                    onClick={handlePurchase}
                    disabled={processing || !user}
                    whileHover={{ scale: 1.03, boxShadow: '0 0 50px rgba(139,92,246,0.4)' }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-primary to-zinc-600 text-white font-bold rounded-2xl text-sm transition-all duration-300 shadow-xl shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {processing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>Обработка...</span>
                      </>
                    ) : (
                      <>
                        {t.purchase.buy} —{' '}
                        {finalPrice === 0 ? (
                          <span className="text-green-300">FREE!</span>
                        ) : (
                          formatPrice(finalPrice)
                        )}
                        {appliedPromo && finalPrice > 0 && (
                          <span className="text-xs line-through text-white/40 ml-1">
                            {formatPrice(currentPlan.basePrice)}
                          </span>
                        )}
                        <ChevronRight size={16} />
                      </>
                    )}
                  </motion.button>
                </motion.div>

                {!user && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-amber-400/80 text-xs mt-4"
                  >
                    ⚠️ Для покупки необходимо войти в аккаунт
                  </motion.p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
