import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import './UIFeedback.css';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

let idCounter = 0;

export const UIFeedbackProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState(null);
    const resolveRef = useRef(null);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++idCounter;
        setToasts((prev) => [...prev, { id, message, type }]);
        if (duration > 0) {
            setTimeout(() => dismissToast(id), duration);
        }
        return id;
    }, [dismissToast]);

    const toast = {
        success: (msg, duration) => showToast(msg, 'success', duration),
        error: (msg, duration) => showToast(msg, 'error', duration),
        info: (msg, duration) => showToast(msg, 'info', duration),
    };

    const confirm = useCallback((options) => {
        const opts = typeof options === 'string' ? { message: options } : options;
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setConfirmState({
                title: opts.title || 'Please confirm',
                message: opts.message || 'Are you sure?',
                confirmText: opts.confirmText || 'Confirm',
                cancelText: opts.cancelText || 'Cancel',
                danger: !!opts.danger,
            });
        });
    }, []);

    const handleConfirmClose = (result) => {
        setConfirmState(null);
        if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
        }
    };

    return (
        <ToastContext.Provider value={toast}>
            <ConfirmContext.Provider value={confirm}>
                {children}

                {/* Toast stack */}
                <div className="toast-stack" aria-live="polite" aria-atomic="true">
                    {toasts.map((t) => (
                        <div key={t.id} className={`toast toast-${t.type}`} role="status">
                            <span className="toast-icon">
                                {t.type === 'success' && '✓'}
                                {t.type === 'error' && '✕'}
                                {t.type === 'info' && 'ℹ'}
                            </span>
                            <span className="toast-message">{t.message}</span>
                            <button
                                className="toast-close"
                                onClick={() => dismissToast(t.id)}
                                aria-label="Dismiss notification"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* Confirm modal */}
                {confirmState && (
                    <div className="confirm-overlay" role="dialog" aria-modal="true">
                        <div className="confirm-modal">
                            <h3>{confirmState.title}</h3>
                            <p>{confirmState.message}</p>
                            <div className="confirm-actions">
                                <button
                                    type="button"
                                    className="confirm-btn-cancel"
                                    onClick={() => handleConfirmClose(false)}
                                >
                                    {confirmState.cancelText}
                                </button>
                                <button
                                    type="button"
                                    className={confirmState.danger ? 'confirm-btn-danger' : 'confirm-btn-primary'}
                                    onClick={() => handleConfirmClose(true)}
                                    autoFocus
                                >
                                    {confirmState.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </ConfirmContext.Provider>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a UIFeedbackProvider');
    return ctx;
};

export const useConfirm = () => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within a UIFeedbackProvider');
    return ctx;
};
