import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { useLegal } from '../context/LegalContext';

const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { openModal } = useLegal();

    useEffect(() => {
        // Check if user has already consented
        const consent = localStorage.getItem('ascend_cookie_consent');
        if (!consent) {
            // Show banner after a short delay for nice entrance
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('ascend_cookie_consent', 'accepted');
        setIsVisible(false);
    };

    const handleReject = () => {
        localStorage.setItem('ascend_cookie_consent', 'rejected');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-[90] md:max-w-md"
                >
                    <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xl shadow-black/20">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl shrink-0">
                                <Cookie className="text-violet-600 dark:text-violet-400" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Vi värnar om din integritet</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                    Vi använder cookies för att förbättra din upplevelse och säkra din inloggning. Genom att fortsätta godkänner du vår{' '}
                                    <button
                                        onClick={() => openModal('cookies')}
                                        className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                                    >
                                        Cookie-policy
                                    </button>.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleAccept}
                                        className="flex-1 px-4 py-2 bg-[#6F00FF] hover:bg-[#5800cc] text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-violet-500/20"
                                    >
                                        Acceptera alla
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Neka
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieBanner;
