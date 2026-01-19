import React, { useState, useEffect } from 'react';
import {
    X,
    Sun,
    Moon,
    LogOut,
    Globe,
    ChevronDown,
    User,
    Unlink,
    Loader2
} from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    setSettings: (settings: UserSettings) => void;
    googleAccount: { name: string; email: string; picture?: string } | null;
    isGoogleConnecting: boolean;
    googleApiReady: boolean;
    handleConnectGoogle: () => void;
    handleDisconnectGoogle: () => void;
    isDark: boolean;
    toggleTheme: () => void;
    user: { email: string } | null;
    onLogout: () => void;
    initialTab?: 'account' | 'billing' | 'customisations' | 'integrations';
}

const SettingsModal = ({
    isOpen,
    onClose,
    settings,
    setSettings,
    googleAccount,
    isGoogleConnecting,
    googleApiReady,
    handleConnectGoogle,
    handleDisconnectGoogle,
    isDark,
    toggleTheme,
    user,
    onLogout,
    initialTab = 'account'
}: SettingsModalProps) => {
    const [activeSettingsTab, setActiveSettingsTab] = useState<'account' | 'billing' | 'customisations' | 'integrations'>(initialTab);
    const [emailUnsubscribed, setEmailUnsubscribed] = useState(false);
    const [localSettings, setLocalSettings] = useState(settings);

    const hasUnsavedChanges = localSettings.timeFormat !== settings.timeFormat ||
        localSettings.timezone !== settings.timezone;

    useEffect(() => {
        if (isOpen) {
            setActiveSettingsTab(initialTab);
            setLocalSettings(settings);
        }
    }, [isOpen, initialTab, settings]);

    const handleSave = () => {
        setSettings(localSettings);
        onClose();
    };

    const handleClose = () => {
        setLocalSettings(settings);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'account', label: 'Account' },
        { id: 'billing', label: 'Billing' },
        { id: 'customisations', label: 'Customisations' },
        { id: 'integrations', label: 'Integrations' },
    ] as const;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your account, billing, customisations, and integrations here.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full"
                            >
                                <div className={`p-1.5 rounded-full transition-all ${!isDark ? 'bg-white shadow-sm' : ''}`}>
                                    <Sun size={14} className={`${!isDark ? 'stroke-gradient' : 'text-slate-400'}`} />
                                </div>
                                <div className={`p-1.5 rounded-full transition-all ${isDark ? 'bg-slate-700 shadow-sm' : ''}`}>
                                    <Moon size={14} className={`${isDark ? 'stroke-gradient' : 'text-slate-400'}`} />
                                </div>
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex min-h-[400px]">
                    <div className="w-48 border-r border-slate-200 dark:border-slate-800 p-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSettingsTab(tab.id)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSettingsTab === tab.id
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-emerald-500'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeSettingsTab === 'account' && (
                            <div className="space-y-6">
                                {user && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                                {user.email?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">Logged in as</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Sign Out</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sign out of your account on all devices.</p>
                                    <button
                                        onClick={onLogout}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Unsubscribe from emails</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">You will not receive any emails from Ascend.</p>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <button
                                            onClick={() => setEmailUnsubscribed(!emailUnsubscribed)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${emailUnsubscribed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${emailUnsubscribed ? 'left-6' : 'left-1'}`} />
                                        </button>
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            Unsubscribe from emails: {emailUnsubscribed ? 'Yes' : 'No'}
                                        </span>
                                    </label>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Delete Account</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Deleting your account will remove all of your data from our servers.</p>
                                    <button className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline">
                                        Click here to delete your account
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeSettingsTab === 'billing' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <button className="px-5 py-2.5 bg-gradient-to-r from-[#6F00FF] to-purple-600 hover:from-[#5800cc] hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                                        Upgrade to Lifetime
                                    </button>
                                    <button className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        Orders Portal
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    You are currently on the Free plan. Upgrade to unlock all features.
                                </p>
                            </div>
                        )}

                        {activeSettingsTab === 'customisations' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Time Format</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Choose how times are displayed in your calendar.</p>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                                        <button
                                            onClick={() => setLocalSettings({ ...localSettings, timeFormat: '12h' })}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${localSettings.timeFormat === '12h' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            12-hour (9:00 AM)
                                        </button>
                                        <button
                                            onClick={() => setLocalSettings({ ...localSettings, timeFormat: '24h' })}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${localSettings.timeFormat === '24h' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            24-hour (09:00)
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Timezone</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Your calendar events will be displayed in this timezone.</p>
                                    <div className="relative w-full max-w-xs">
                                        <select
                                            value={localSettings.timezone}
                                            onChange={(e) => setLocalSettings({ ...localSettings, timezone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        >
                                            <option value="Local">Local Time</option>
                                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                                            <option value="EST">EST (Eastern Standard Time)</option>
                                            <option value="PST">PST (Pacific Standard Time)</option>
                                            <option value="CET">CET (Central European Time)</option>
                                        </select>
                                        <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSettingsTab === 'integrations' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Google Calendar</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sync your schedule with Google Calendar for two-way sync.</p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
                                        {googleAccount ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                Synced
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                Not Connected
                                            </span>
                                        )}
                                    </div>

                                    {googleAccount ? (
                                        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                            <div className="flex items-center gap-3">
                                                {googleAccount.picture ? (
                                                    <img
                                                        src={googleAccount.picture}
                                                        alt={googleAccount.name || googleAccount.email}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                        <User size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{googleAccount.name}</p>
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{googleAccount.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleDisconnectGoogle}
                                                className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <Unlink size={16} />
                                                Disconnect
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleConnectGoogle}
                                            disabled={isGoogleConnecting || !googleApiReady}
                                            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            {isGoogleConnecting ? (
                                                <>
                                                    <Loader2 size={20} className="animate-spin text-slate-500" />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Connecting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Connect Google Calendar</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <div>
                            {hasUnsavedChanges && (
                                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    You have unsaved changes
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges}
                                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${hasUnsavedChanges
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
