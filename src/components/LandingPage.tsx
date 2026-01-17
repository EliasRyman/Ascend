import React from 'react';
import { ArrowRight, Check, LayoutDashboard, RefreshCw, Target, Calendar, Play } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const scrollToFeatures = () => {
        const featuresParams = document.getElementById('features');
        if (featuresParams) {
            featuresParams.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-violet-100 dark:selection:bg-violet-900/30">

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-violet-50/50 to-transparent dark:from-violet-950/20 dark:to-transparent pointer-events-none" />
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-20 -left-40 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-6xl mx-auto px-6 pt-20 pb-20 relative z-10 flex flex-col items-center text-center">

                    {/* Logo / Icon */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl shadow-violet-600/30 mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-500 bg-white dark:bg-slate-900 flex items-center justify-center">
                        <div className="w-full h-full flex items-center justify-center">
                            <img src="/favicon.svg" alt="Ascend Logo" className="w-16 h-16" />
                        </div>
                    </div>

                    {/* Headlines */}
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight max-w-4xl leading-[1.1]">
                        Få kontroll på din dag – <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6F00FF] to-fuchsia-600">visuellt.</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed">
                        Timeboxing, uppgifter och kalender i perfekt synk. Byggd för dig som vill jobba djupt och distraktionsfritt.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                        <button
                            onClick={onGetStarted}
                            className="group w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#6F00FF] text-white rounded-full font-bold text-lg hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-600/20 transition-all transform hover:-translate-y-1"
                        >
                            Starta gratis
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={scrollToFeatures}
                            className="group w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                        >
                            Se hur det funkar
                            <Play size={18} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                        </button>
                    </div>

                    {/* Trust / Social Proof */}
                    <div className="mt-8 flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <Check size={16} className="text-emerald-500" /> Inget kreditkort krävs
                        </span>
                        <span className="hidden sm:block text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1.5">
                            <Check size={16} className="text-emerald-500" /> Kom igång med Google
                        </span>
                    </div>

                </div>
            </div>

            {/* Benefits Section */}
            <div id="features" className="py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50">
                <div className="max-w-6xl mx-auto px-6">

                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Ett workspace för allt</h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            Sluta hoppa mellan to-do listor och kalendrar. Ascend samlar allt på ett ställe.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">

                        {/* Feature 1 */}
                        <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/30 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors duration-300 border border-transparent hover:border-violet-100 dark:hover:border-violet-900/30">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <LayoutDashboard className="text-[#6F00FF]" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Planera visuellt</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                Dra-och-släpp dina uppgifter direkt i schemat. Se exakt <em className="not-italic text-slate-700 dark:text-slate-300 font-medium">när</em> jobbet blir gjort, inte bara <em className="not-italic text-slate-700 dark:text-slate-300 font-medium">att</em> det ska göras.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors duration-300 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <RefreshCw className="text-emerald-500" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Allt i din kalender</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                Full tvåvägssynk med Google Kalender. Dina tidsblock blir möten, och dina möten blir block. Ersätt dubbelarbete med automatik.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/30 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors duration-300 border border-transparent hover:border-amber-100 dark:hover:border-amber-900/30">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Target className="text-amber-500" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Bygg rutiner för deep work</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                Använd fokuslägen och en ren design för att stänga ute distraktioner och hitta ditt flow varje dag.
                            </p>
                        </div>

                    </div>

                </div>
            </div>

            {/* Footer / Final CTA */}
            <div className="py-20 border-t border-slate-100 dark:border-slate-800 text-center px-6">
                <h2 className="text-3xl font-bold mb-8">Redo att ta kontroll?</h2>
                <button
                    onClick={onGetStarted}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                    Kom igång nu
                </button>
            </div>

        </div>
    );
};

export default LandingPage;
