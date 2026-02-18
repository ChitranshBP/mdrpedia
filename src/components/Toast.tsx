/**
 * MDRPedia — Toast Notification System
 * A modern toast notification component for user feedback
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((message: string, duration = 4000) => {
        addToast({ message, type: 'success', duration });
    }, [addToast]);

    const error = useCallback((message: string, duration = 6000) => {
        addToast({ message, type: 'error', duration });
    }, [addToast]);

    const warning = useCallback((message: string, duration = 5000) => {
        addToast({ message, type: 'warning', duration });
    }, [addToast]);

    const info = useCallback((message: string, duration = 4000) => {
        addToast({ message, type: 'info', duration });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// ─── Toast Container ─────────────────────────────────────────────────────────

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
            role="region"
            aria-label="Notifications"
            aria-live="polite"
        >
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

// ─── Toast Item ──────────────────────────────────────────────────────────────

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const duration = toast.duration ?? 4000;
        const timer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.duration, onClose]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(onClose, 300);
    };

    const icons: Record<ToastType, React.ReactNode> = {
        success: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    const colors: Record<ToastType, string> = {
        success: 'bg-green-500/10 border-green-500/30 text-green-400',
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    };

    const iconBg: Record<ToastType, string> = {
        success: 'bg-green-500/20',
        error: 'bg-red-500/20',
        warning: 'bg-yellow-500/20',
        info: 'bg-blue-500/20',
    };

    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${colors[toast.type]} ${
                isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
            }`}
            role="alert"
            aria-live="assertive"
        >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBg[toast.type]}`}>
                {icons[toast.type]}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{toast.message}</p>
                {toast.action && (
                    <button
                        onClick={() => {
                            toast.action?.onClick();
                            handleClose();
                        }}
                        className="mt-2 text-xs font-bold uppercase tracking-wider hover:underline"
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>

            <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                aria-label="Close notification"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// ─── Standalone Toast Function (for non-React contexts) ─────────────────────

let toastHandler: ToastContextType | null = null;

export function setToastHandler(handler: ToastContextType) {
    toastHandler = handler;
}

export function showToast(message: string, type: ToastType = 'info', duration?: number) {
    if (toastHandler) {
        toastHandler.addToast({ message, type, duration });
    } else {
        // Fallback to console in development
        console.log(`[Toast ${type}]: ${message}`);
    }
}

export default ToastProvider;
