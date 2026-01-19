import React, { useState } from 'react';
import { ArrowRight, Check, RefreshCw, Zap, Calendar, LayoutGrid, Plus, Minus, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#6F00FF] p-1.5 rounded-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            </svg>
                        </div>
                        <span className="font-bold text-lg tracking-tight">Ascend</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <button onClick={() => scrollToSection('workflow')} className="hover:text-slate-900 transition-colors">Workflow</button>
                        <button onClick={() => scrollToSection('features')} className="hover:text-slate-900 transition-colors">Features</button>
                        <button onClick={() => scrollToSection('pricing')} className="hover:text-slate-900 transition-colors">Pricing</button>
                        <button onClick={() => scrollToSection('faq')} className="hover:text-slate-900 transition-colors">FAQ</button>
                    </div>

                    <button
                        onClick={onGetStarted}
                        className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 text-center">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                        <div>10X YOUR PRODUCTIVITY</div>
                        <div className="text-transparent bg-clip-text bg-gradient-to-r from-[#6F00FF] to-fuchsia-600 pb-2">
                            TAKE CHARGE OF YOUR TIME
                        </div>
                    </h1>

                    <div className="flex flex-col items-center gap-6 mt-12">
                        <button
                            onClick={onGetStarted}
                            className="group flex items-center gap-2 bg-[#8B5CF6] text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-[#7C3AED] transition-all hover:scale-105 shadow-xl shadow-purple-500/30"
                        >
                            Start your 14-day free trial
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-slate-500 text-sm font-medium">No credit card required</p>

                        <div className="mt-8 flex flex-col items-center gap-3">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="User" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex text-[#6F00FF] gap-0.5 mb-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Star key={i} size={16} fill="currentColor" />
                                    ))}
                                </div>
                                <p className="text-slate-900 font-bold italic text-sm">850 makers love us</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Workflow Section */}
            <section id="workflow" className="py-24 bg-slate-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">Workflow</span>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Your new daily ritual.</h2>
                        <p className="text-slate-500 text-lg">Ascend gives you a structure that actually works.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-purple-200 to-transparent -z-10" />

                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mb-8 z-10 relative">
                                    <RefreshCw className="text-[#6F00FF]" size={32} />
                                </div>
                                <div className="absolute -top-3 -right-3 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">01</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Sync</h3>
                            <p className="text-slate-500 leading-relaxed max-w-xs">
                                Connect your Google Calendar. Two-way sync keeps everything updated instantly.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mb-8 z-10 relative">
                                    <Zap className="text-[#6F00FF]" size={32} />
                                </div>
                                <div className="absolute -top-3 -right-3 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">02</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Habits</h3>
                            <p className="text-slate-500 leading-relaxed max-w-xs">
                                Define your daily non-negotiables. Sleep, exercise, deep work. Track them visually.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mb-8 z-10 relative">
                                    <Calendar className="text-[#6F00FF]" size={32} />
                                </div>
                                <div className="absolute -top-3 -right-3 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">03</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Plan</h3>
                            <p className="text-slate-500 leading-relaxed max-w-xs">
                                Drag tasks into your calendar. Give every to-do a time and place. Reality check your day.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold mb-4 tracking-tight">One workspace for everything.</h2>
                        <p className="text-slate-500 text-lg">Stop switching apps. Ascend collects it all.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Feature Card 1 */}
                        <div className="border border-slate-100 rounded-[2.5rem] p-10 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="h-48 bg-purple-100/30 rounded-2xl mb-8 flex items-center justify-center overflow-hidden relative">
                                <div className="absolute top-8 left-8 right-8 bottom-0 bg-white rounded-t-xl shadow-sm border border-slate-100 p-4">
                                    <div className="space-y-3">
                                        <div className="h-8 bg-purple-50 rounded w-3/4"></div>
                                        <div className="h-8 bg-green-50 rounded w-full"></div>
                                        <div className="h-8 bg-blue-50 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-[#6F00FF]">
                                <LayoutGrid size={24} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Visual Timeboxing</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Drag and drop your tasks directly into the calendar. Spot gaps in your schedule and fill them with meaningful work.
                            </p>
                        </div>

                        {/* Feature Card 2 */}
                        <div className="border border-slate-100 rounded-[2.5rem] p-10 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="h-48 bg-green-50/30 rounded-2xl mb-8 flex items-center justify-center relative overflow-hidden">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-500">
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    </div>
                                    <RefreshCw className="text-slate-300" />
                                    <div className="w-16 h-16 bg-[#6F00FF] rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center text-white">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-green-600">
                                <RefreshCw size={24} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Google Calendar Sync</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Real-time two-way sync. Change in Ascend, see it in Google. Change in Google, see it in Ascend.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-50">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 tracking-tight">Simple Pricing.</h2>
                        <p className="text-slate-500 text-lg">Invest in your time.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Starter */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200">
                            <h3 className="text-xl font-bold mb-2">Starter</h3>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-4xl font-bold text-slate-900">$0</span>
                                <span className="text-slate-500">/ 14 days</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-8">Perfect for getting started with timeboxing.</p>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-slate-700">
                                    <Check className="text-slate-400" size={18} /> Timeboxing
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700">
                                    <Check className="text-slate-400" size={18} /> 3 Habits
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700">
                                    <Check className="text-slate-400" size={18} /> Two-way Google Sync
                                </li>
                            </ul>

                            <button
                                onClick={onGetStarted}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Start 14-day free trial
                            </button>
                        </div>

                        {/* Lifetime */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-[#6F00FF] relative shadow-2xl shadow-purple-500/10 transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-[#6F00FF] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider">
                                Most Popular
                            </div>
                            <h3 className="text-xl font-bold mb-2">Lifetime</h3>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-4xl font-bold text-slate-900">$39</span>
                                <span className="text-slate-500">/ one-time</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-8">Pay once, own it forever.</p>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                                    <Check className="text-[#6F00FF]" size={18} /> Unlimited Timeboxing
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                                    <Check className="text-[#6F00FF]" size={18} /> Unlimited Habits
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                                    <Check className="text-[#6F00FF]" size={18} /> Two-way Google Sync
                                </li>
                                <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                                    <Check className="text-[#6F00FF]" size={18} /> Advanced Analytics
                                </li>
                            </ul>

                            <button
                                onClick={onGetStarted}
                                className="w-full py-3 bg-[#8B5CF6] text-white rounded-xl font-bold hover:bg-[#7C3AED] transition-colors shadow-lg shadow-purple-500/20"
                            >
                                Get Lifetime Deal
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24">
                <div className="max-w-3xl mx-auto px-6">
                    <h2 className="text-4xl font-bold mb-16 tracking-tight text-center">Frequently Asked Questions</h2>

                    <div className="space-y-4">
                        <FAQItem
                            question="What's the difference from a regular to-do list?"
                            answer="Ascend adds the dimension of time. Instead of an endless list of tasks, you place them into your calendar. This forces you to be realistic about what you can accomplish in a day."
                        />
                        <FAQItem
                            question="Does it work with Google Calendar?"
                            answer="Yes! Ascend has a robust two-way sync. Any task you schedule in Ascend appears in Google Calendar, and any meeting in Google Calendar blocks time in Ascend."
                        />
                        <FAQItem
                            question="Does it cost anything?"
                            answer="We offer a 14-day free trial so you can experience the full power of timeboxing. After that, we offer a simple one-time payment for lifetime access. No subscriptions."
                        />
                        <FAQItem
                            question="Is there a mobile app?"
                            answer="Currently, Ascend is optimized for desktop and tablet web browsers to give you the best planning experience. A mobile companion app is on our roadmap."
                        />
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-32 text-center px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-5xl font-extrabold mb-6 tracking-tight text-slate-900">Ready to own your day?</h2>
                    <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto">
                        Join 800+ others who switched from chaos to control. Try risk-free today.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="bg-[#8B5CF6] text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-[#7C3AED] transition-all hover:scale-105 shadow-xl shadow-purple-500/30"
                    >
                        Get Started — It's Free
                    </button>
                    <p className="text-slate-400 text-xs mt-6">No credit card required. No lock-in.</p>
                </div>
            </section>

            {/* Footer Links */}
            <footer className="py-12 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-8 text-sm text-slate-400 mb-6">
                    <a href="#" className="hover:text-slate-600">Privacy Policy</a>
                    <a href="#" className="hover:text-slate-600">Terms of Service</a>
                    <a href="#" className="hover:text-slate-600">Cookie Policy</a>
                </div>
                <p className="text-slate-400 text-xs">© 2026 Ascend. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <span className="font-bold text-slate-800">{question}</span>
                <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-slate-200' : ''}`}>
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </div>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <p className="px-6 pb-6 text-slate-500 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
};

export default LandingPage;
