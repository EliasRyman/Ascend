import React, { useEffect, useRef } from 'react';
import { X, Shield, FileText, Cookie } from 'lucide-react';
import { useLegal } from '../context/LegalContext';

const LegalModals = () => {
    const { activeModal, closeModal } = useLegal();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                closeModal();
            }
        };

        if (activeModal) {
            document.addEventListener('mousedown', handleClickOutside);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [activeModal, closeModal]);

    if (!activeModal) return null;

    const content = {
        privacy: {
            title: 'Privacy Policy',
            icon: <Shield size={24} className="text-[#6F00FF]" />,
            lastUpdated: 'December 14, 2024',
            body: (
                <>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">1. Introduction</h3>
                    <p className="mb-4">Ascend ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our timeboxing and productivity application.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">2. Information We Collect</h3>
                    <p className="mb-2">When you use Ascend, we may collect:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                        <li><strong>Account Information:</strong> Email address and name when you create an account via email or Google Auth.</li>
                        <li><strong>Task Data:</strong> Tasks, schedule blocks, habits, and notes you create within the app.</li>
                        <li><strong>Google Calendar Data:</strong> If you choose to connect Google Calendar, we access your calendar events to display and sync with your schedule.</li>
                        <li><strong>Usage Data:</strong> Basic analytics on how you interact with the app to improve our services.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">3. How We Use Your Information</h3>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                        <li>To provide and maintain the Ascend service.</li>
                        <li>To sync your tasks and schedule across devices via Supabase.</li>
                        <li>To display and create Google Calendar events (only with your explicit permission).</li>
                        <li>To improve and personalize your experience.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">4. Google Calendar Integration</h3>
                    <p className="mb-4">When you connect your Google Calendar, we adhere to Google API Services User Data Policy. We only access calendar data necessary to display and create events initiated by you. We do not share your calendar data with third parties or use it for advertising.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">5. Data Storage & Security</h3>
                    <p className="mb-4">Your data is stored securely using Supabase, which provides enterprise-grade security and encryption at rest and in transit. We implement appropriate technical measures to protect your personal information.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">6. Your Rights (GDPR)</h3>
                    <p className="mb-2">Under GDPR, you have the right to:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                        <li>Access your personal data.</li>
                        <li>Rectify inaccurate personal data.</li>
                        <li>Request deletion of your account and all associated data ("Right to be forgotten").</li>
                        <li>Restrict or object to processing.</li>
                        <li>Data portability.</li>
                    </ul>
                    <p className="mb-4">You can exercise these rights by contacting us or using the settings in the application.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">7. Contact Us</h3>
                    <p className="mb-4">If you have questions about this Privacy Policy, please contact us at: <a href="mailto:privacy@ascend.app" className="text-[#6F00FF] hover:underline">privacy@ascend.app</a></p>
                </>
            )
        },
        terms: {
            title: 'Terms of Service',
            icon: <FileText size={24} className="text-[#6F00FF]" />,
            lastUpdated: 'December 14, 2024',
            body: (
                <>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">1. Acceptance of Terms</h3>
                    <p className="mb-4">By accessing or using Ascend, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">2. Description of Service</h3>
                    <p className="mb-4">Ascend is a productivity tool that provides timeboxing, task management, and habit tracking features. We utilize Supabase for data storage and authentication.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">3. User Accounts</h3>
                    <p className="mb-4">You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">4. Intellectual Property</h3>
                    <p className="mb-4">The Service and its original content, features, and functionality are and will remain the exclusive property of Ascend and its licensors. The Service is protected by copyright and other laws.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">5. Termination</h3>
                    <p className="mb-4">We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">6. Limitation of Liability</h3>
                    <p className="mb-4">In no event shall Ascend, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
                </>
            )
        },
        cookies: {
            title: 'Cookie Policy',
            icon: <Cookie size={24} className="text-[#6F00FF]" />,
            lastUpdated: 'December 14, 2024',
            body: (
                <>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">1. What Are Cookies</h3>
                    <p className="mb-4">Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.</p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">2. How We Use Cookies</h3>
                    <p className="mb-2">Ascend uses cookies for the following purposes:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                        <li><strong>Essential Cookies:</strong> These are necessary for the website to function properly. For example, we use cookies from Supabase to maintain your authenticated user session.</li>
                        <li><strong>Preferences:</strong> We store your preferences, such as your decision to accept or reject non-essential cookies.</li>
                        <li><strong>Analytics:</strong> We may use anonymous analytics cookies to understand how users interact with our application to improve performance.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">3. Managing Cookies</h3>
                    <p className="mb-4">You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. If you disable or refuse cookies, please note that some parts of this website may become inaccessible or not function properly (e.g., you may not be able to log in).</p>
                </>
            )
        }
    };

    const currentContent = content[activeModal];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div
                ref={modalRef}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-scale-up"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                            {currentContent.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentContent.title}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: {currentContent.lastUpdated}</p>
                        </div>
                    </div>
                    <button
                        onClick={closeModal}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {currentContent.body}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={closeModal}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LegalModals;
