import React, { useState } from 'react';
import { useToast } from './Toast';

interface DoctorVerificationData {
    fullName: string;
    specialty: string;
    registrationNumber?: string;
    credential?: string;
    country?: string;
}

interface NPIClaimWizardProps {
    onSuccess?: (doctor: DoctorVerificationData) => void;
}

// Verification methods by region
const VERIFICATION_METHODS = [
    { code: 'NPI', label: 'NPI (United States)', country: 'United States', placeholder: '10-digit NPI', pattern: /^\d{10}$/, maxLength: 10 },
    { code: 'GMC', label: 'GMC Number (United Kingdom)', country: 'United Kingdom', placeholder: '7-digit GMC', pattern: /^\d{7}$/, maxLength: 7 },
    { code: 'AHPRA', label: 'AHPRA (Australia)', country: 'Australia', placeholder: 'MED followed by 10 digits', pattern: /^MED\d{10}$/i, maxLength: 13 },
    { code: 'MCI', label: 'MCI Registration (India)', country: 'India', placeholder: 'State code + number', pattern: /^[A-Z]{2,3}\d+$/i, maxLength: 15 },
    { code: 'ORCID', label: 'ORCID iD (International)', country: 'International', placeholder: '0000-0000-0000-0000', pattern: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i, maxLength: 19 },
    { code: 'EMAIL', label: 'Institutional Email', country: 'International', placeholder: 'name@institution.edu', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, maxLength: 100 },
];

// Step labels for progress indicator
const STEPS = [
    { number: 1, label: 'Method', icon: 'globe' },
    { number: 2, label: 'Verify', icon: 'shield' },
    { number: 3, label: 'Confirm', icon: 'user' },
    { number: 4, label: 'Complete', icon: 'check' },
];

export default function NPIClaimWizard({ onSuccess }: NPIClaimWizardProps) {
    const [step, setStep] = useState(1);
    const [selectedMethod, setSelectedMethod] = useState<typeof VERIFICATION_METHODS[0] | null>(null);
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [doctorData, setDoctorData] = useState<DoctorVerificationData | null>(null);
    const [focusedInput, setFocusedInput] = useState(false);

    // Try to use toast, fallback gracefully if not in provider
    let toast: ReturnType<typeof useToast> | null = null;
    try {
        toast = useToast();
    } catch {
        // Not wrapped in ToastProvider, will use inline messages
    }

    // Validate input based on selected method
    const isInputValid = selectedMethod ? selectedMethod.pattern.test(registrationNumber) : false;
    const progressPercentage = selectedMethod
        ? Math.min((registrationNumber.length / selectedMethod.maxLength) * 100, 100)
        : 0;

    const handleMethodSelect = (method: typeof VERIFICATION_METHODS[0]) => {
        setSelectedMethod(method);
        setRegistrationNumber('');
        setError('');
        setStep(2);
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedMethod || !isInputValid) {
            setError(`Please enter a valid ${selectedMethod?.label || 'registration number'}`);
            return;
        }

        setLoading(true);
        setError('');

        try {
            // API call based on verification method
            const endpoint = selectedMethod.code === 'NPI'
                ? `/api/npi-validate?npi=${registrationNumber}`
                : `/api/verify-registration?type=${selectedMethod.code}&number=${encodeURIComponent(registrationNumber)}`;

            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.valid) {
                setDoctorData({
                    ...data.doctor,
                    country: selectedMethod.country,
                    registrationNumber: registrationNumber
                });
                setStep(3);
                toast?.success('Identity verified successfully!');
            } else {
                setError(data.message || 'Invalid registration number');
                toast?.error(data.message || 'Invalid registration number');
            }
        } catch {
            const errorMsg = 'System Error. Please try again.';
            setError(errorMsg);
            toast?.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async () => {
        if (!doctorData) return;

        setLoading(true);
        try {
            toast?.success(`Profile for ${doctorData.fullName} claimed! Redirecting...`);
            onSuccess?.(doctorData);

            setTimeout(() => {
                window.location.href = '/doctor/portal';
            }, 1500);
        } catch {
            toast?.error('Failed to claim profile. Please try again.');
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        // Format ORCID with dashes
        if (selectedMethod?.code === 'ORCID') {
            value = value.replace(/[^\dX]/gi, '').slice(0, 16);
            if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
            if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
            if (value.length > 14) value = value.slice(0, 14) + '-' + value.slice(14);
        } else if (selectedMethod?.code === 'NPI' || selectedMethod?.code === 'GMC') {
            value = value.replace(/\D/g, '').slice(0, selectedMethod.maxLength);
        } else if (selectedMethod?.code === 'AHPRA') {
            value = value.toUpperCase().slice(0, selectedMethod.maxLength);
        }

        setRegistrationNumber(value);
        if (error) setError('');
    };

    const renderStepIcon = (iconName: string, isActive: boolean, isCompleted: boolean) => {
        const color = isCompleted ? 'var(--verdant)' : isActive ? 'var(--ink-blue)' : 'var(--ink-3)';
        switch (iconName) {
            case 'globe':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                );
            case 'shield':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                );
            case 'user':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                );
            case 'check':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getStepWidth = () => {
        if (step === 1) return '0%';
        if (step === 2) return '33%';
        if (step === 3) return '66%';
        return '100%';
    };

    return (
        <div className="npi-wizard">
            <style>{`
                .npi-wizard {
                    max-width: 480px;
                    margin: 0 auto;
                    position: relative;
                }

                .wizard-card {
                    background: var(--paper);
                    border: 1px solid var(--rule);
                    border-radius: var(--r-4);
                    padding: 2rem;
                    box-shadow: var(--shadow-3);
                    position: relative;
                    overflow: hidden;
                }

                .wizard-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--ink-blue);
                }

                /* Progress Steps */
                .progress-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    position: relative;
                    padding: 0 0.25rem;
                }

                .progress-line {
                    position: absolute;
                    top: 50%;
                    left: 2rem;
                    right: 2rem;
                    height: 2px;
                    background: var(--rule);
                    transform: translateY(-50%);
                    z-index: 0;
                }

                .progress-line-fill {
                    position: absolute;
                    top: 50%;
                    left: 2rem;
                    height: 2px;
                    background: var(--ink-blue);
                    transform: translateY(-50%);
                    z-index: 1;
                    transition: width 0.5s var(--ease);
                }

                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.375rem;
                    position: relative;
                    z-index: 2;
                }

                .step-circle {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s var(--ease);
                }

                .step-circle.inactive {
                    background: var(--paper);
                    border: 2px solid var(--rule);
                }

                .step-circle.active {
                    background: var(--ink-blue-2);
                    border: 2px solid var(--ink-blue);
                }

                .step-circle.completed {
                    background: var(--verdant-2);
                    border: 2px solid var(--verdant);
                }

                .step-label {
                    font-size: 0.6rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--ink-3);
                    font-family: var(--font-sans);
                }

                .step-label.active { color: var(--ink-blue); }
                .step-label.completed { color: var(--verdant); }

                /* Header */
                .wizard-header {
                    text-align: center;
                    margin-bottom: 1.75rem;
                }

                .wizard-icon {
                    width: 56px;
                    height: 56px;
                    margin: 0 auto 1rem;
                    background: var(--ink-blue-2);
                    border-radius: var(--r-4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid color-mix(in srgb, var(--ink-blue) 25%, transparent);
                }

                .wizard-title {
                    font-size: 1.5rem;
                    font-weight: 500;
                    color: var(--ink);
                    margin: 0 0 0.5rem;
                    font-family: var(--font-serif);
                }

                .wizard-subtitle {
                    font-size: 0.875rem;
                    color: var(--ink-2);
                    margin: 0;
                    line-height: 1.5;
                }

                /* Method Selection */
                .method-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .method-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.875rem 1rem;
                    background: var(--paper);
                    border: 1px solid var(--rule);
                    border-radius: var(--r-3);
                    cursor: pointer;
                    transition: all var(--t-base) var(--ease);
                    text-align: left;
                    font-family: var(--font-sans);
                }

                .method-btn:hover {
                    background: var(--ink-blue-2);
                    border-color: var(--ink-blue);
                    box-shadow: var(--shadow-2);
                }

                .method-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--ink-blue-2);
                    border-radius: var(--r-3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .method-icon svg {
                    width: 20px;
                    height: 20px;
                    color: var(--ink-blue);
                }

                .method-info {
                    flex: 1;
                }

                .method-label {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--ink);
                    display: block;
                    margin-bottom: 2px;
                }

                .method-country {
                    font-size: 0.75rem;
                    color: var(--ink-3);
                }

                .method-arrow {
                    color: var(--ink-3);
                    transition: transform var(--t-fast), color var(--t-fast);
                }

                .method-btn:hover .method-arrow {
                    color: var(--ink-blue);
                    transform: translateX(4px);
                }

                /* Input Section */
                .input-section {
                    margin-bottom: 1.25rem;
                }

                .input-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--ink-3);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.625rem;
                    font-family: var(--font-sans);
                }

                .input-label svg {
                    color: var(--ink-3);
                }

                .input-wrapper {
                    position: relative;
                    margin-bottom: 0.625rem;
                }

                .reg-input {
                    width: 100%;
                    background: var(--paper);
                    border: 2px solid var(--rule);
                    border-radius: var(--r-3);
                    padding: 0.875rem 1rem 0.875rem 3rem;
                    font-size: 1.15rem;
                    font-family: var(--font-mono);
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    color: var(--ink);
                    text-align: center;
                    transition: all var(--t-base) var(--ease);
                    outline: none;
                    box-sizing: border-box;
                }

                .reg-input::placeholder {
                    color: var(--ink-3);
                    font-weight: 400;
                    letter-spacing: 0.02em;
                    font-size: 0.95rem;
                }

                .reg-input:focus {
                    border-color: var(--ink-blue);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-blue) 12%, transparent);
                }

                .reg-input.valid {
                    border-color: var(--verdant);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--verdant) 12%, transparent);
                }

                .reg-input.error {
                    border-color: var(--sanguine);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--sanguine) 12%, transparent);
                }

                .input-icon {
                    position: absolute;
                    left: 0.875rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--ink-3);
                }

                .input-icon.focused { color: var(--ink-blue); }
                .input-icon.valid { color: var(--verdant); }

                /* Progress Bar */
                .progress-bar-container {
                    height: 3px;
                    background: var(--rule);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 0.625rem;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--ink-blue);
                    border-radius: 2px;
                    transition: width 0.2s ease-out;
                }

                .progress-bar-fill.complete {
                    background: var(--verdant);
                }

                /* Input Meta */
                .input-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.7rem;
                    font-family: var(--font-mono);
                }

                .valid-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: var(--verdant);
                    font-weight: 600;
                    font-family: var(--font-sans);
                }

                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: var(--sanguine);
                    font-size: 0.8rem;
                    margin-top: 0.625rem;
                    padding: 0.625rem 0.875rem;
                    background: var(--sanguine-2);
                    border: 1px solid color-mix(in srgb, var(--sanguine) 25%, transparent);
                    border-radius: var(--r-3);
                }

                .error-message svg {
                    color: var(--sanguine);
                    flex-shrink: 0;
                }

                /* Buttons */
                .submit-btn {
                    width: 100%;
                    padding: 0.875rem 1.5rem;
                    border: none;
                    border-radius: var(--r-3);
                    font-size: 0.875rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all var(--t-base) var(--ease);
                    font-family: var(--font-sans);
                }

                .submit-btn.disabled {
                    background: var(--paper-3);
                    color: var(--ink-3);
                    cursor: not-allowed;
                    border: 1px solid var(--rule);
                }

                .submit-btn.active {
                    background: var(--ink);
                    color: var(--paper);
                    box-shadow: var(--shadow-2);
                }

                .submit-btn.active:hover {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-3);
                }

                .btn-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid color-mix(in srgb, var(--paper) 30%, transparent);
                    border-top-color: var(--paper);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .back-btn {
                    width: 100%;
                    padding: 0.75rem;
                    background: transparent;
                    border: none;
                    color: var(--ink-3);
                    font-size: 0.8rem;
                    cursor: pointer;
                    margin-top: 0.5rem;
                    font-family: var(--font-sans);
                    transition: color var(--t-fast);
                }

                .back-btn:hover { color: var(--ink); }

                /* Trust Footer */
                .trust-footer {
                    margin-top: 1.25rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--rule);
                }

                .trust-badges {
                    display: flex;
                    justify-content: center;
                    gap: 1.25rem;
                    margin-bottom: 0.75rem;
                }

                .trust-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    font-size: 0.65rem;
                    color: var(--ink-3);
                    font-family: var(--font-sans);
                }

                .trust-text {
                    text-align: center;
                    font-size: 0.65rem;
                    color: var(--ink-3);
                    line-height: 1.5;
                }

                .trust-link {
                    color: var(--ink-blue);
                    text-decoration: none;
                }

                /* Step 3: Confirmation */
                .success-icon {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 1.25rem;
                    background: var(--verdant-2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid color-mix(in srgb, var(--verdant) 30%, transparent);
                    animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes scale-in {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .doctor-card {
                    background: var(--ink-blue-2);
                    border: 1px solid color-mix(in srgb, var(--ink-blue) 25%, transparent);
                    border-radius: var(--r-4);
                    padding: 1rem;
                    margin: 1.25rem 0;
                }

                .doctor-info {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                }

                .doctor-avatar {
                    width: 48px;
                    height: 48px;
                    background: var(--ink-blue);
                    border-radius: var(--r-3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--paper);
                    font-family: var(--font-serif);
                }

                .doctor-details h3 {
                    margin: 0 0 0.25rem;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--ink);
                    font-family: var(--font-sans);
                }

                .doctor-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: var(--verdant);
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    background: var(--verdant);
                    border-radius: 50%;
                }

                .confirm-btn {
                    width: 100%;
                    padding: 0.875rem 1.5rem;
                    background: var(--verdant);
                    border: none;
                    border-radius: var(--r-3);
                    color: var(--paper);
                    font-size: 0.875rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    box-shadow: var(--shadow-2);
                    transition: all var(--t-base) var(--ease);
                    font-family: var(--font-sans);
                }

                .confirm-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-3);
                }

                .animate-in {
                    animation: fade-in 0.4s ease-out;
                }

                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className="wizard-card">
                {/* Progress Steps */}
                <div className="progress-container">
                    <div className="progress-line"></div>
                    <div className="progress-line-fill" style={{ width: getStepWidth() }}></div>
                    {STEPS.map((s) => (
                        <div key={s.number} className="step-item">
                            <div className={`step-circle ${
                                step > s.number ? 'completed' :
                                step === s.number ? 'active' : 'inactive'
                            }`}>
                                {renderStepIcon(s.icon, step === s.number, step > s.number)}
                            </div>
                            <span className={`step-label ${
                                step > s.number ? 'completed' :
                                step === s.number ? 'active' : ''
                            }`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Select Verification Method */}
                {step === 1 && (
                    <div className="animate-in">
                        <div className="wizard-header">
                            <div className="wizard-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-blue)" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                            </div>
                            <h2 className="wizard-title">Verify Your Identity</h2>
                            <p className="wizard-subtitle">
                                Select your verification method based on your region or professional registration
                            </p>
                        </div>

                        <div className="method-grid">
                            {VERIFICATION_METHODS.map((method) => (
                                <button
                                    key={method.code}
                                    className="method-btn"
                                    onClick={() => handleMethodSelect(method)}
                                >
                                    <div className="method-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            {method.code === 'NPI' && <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                                            {method.code === 'GMC' && <path d="M12 14l9-5-9-5-9 5 9 5zm0 7l9-5-9-5-9 5 9 5z" />}
                                            {method.code === 'AHPRA' && <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />}
                                            {method.code === 'MCI' && <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />}
                                            {method.code === 'ORCID' && <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v8m-4-4h8" />}
                                            {method.code === 'EMAIL' && <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                                        </svg>
                                    </div>
                                    <div className="method-info">
                                        <span className="method-label">{method.label}</span>
                                        <span className="method-country">{method.country}</span>
                                    </div>
                                    <svg className="method-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            ))}
                        </div>

                        <div className="trust-footer">
                            <p className="trust-text">
                                Supported in 78+ countries. Your data is encrypted and secure.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Enter Registration Number */}
                {step === 2 && selectedMethod && (
                    <form onSubmit={handleVerifySubmit} className="animate-in">
                        <div className="wizard-header">
                            <div className="wizard-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-blue)" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                            </div>
                            <h2 className="wizard-title">Enter Your {selectedMethod.code}</h2>
                            <p className="wizard-subtitle">
                                {selectedMethod.label} - {selectedMethod.country}
                            </p>
                        </div>

                        <div className="input-section">
                            <label className="input-label">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="16" rx="2" />
                                    <path d="M7 8h10M7 12h6" />
                                </svg>
                                Registration Number
                            </label>

                            <div className="input-wrapper">
                                <span className={`input-icon ${focusedInput ? 'focused' : ''} ${isInputValid ? 'valid' : ''}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={registrationNumber}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedInput(true)}
                                    onBlur={() => setFocusedInput(false)}
                                    className={`reg-input ${error ? 'error' : isInputValid ? 'valid' : ''}`}
                                    placeholder={selectedMethod.placeholder}
                                    maxLength={selectedMethod.maxLength}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="progress-bar-container">
                                <div
                                    className={`progress-bar-fill ${isInputValid ? 'complete' : ''}`}
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>

                            <div className="input-meta">
                                <span style={{ color: 'var(--ink-3)' }}>
                                    {registrationNumber.length} / {selectedMethod.maxLength}
                                </span>
                                {isInputValid && (
                                    <span className="valid-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                        Valid format
                                    </span>
                                )}
                            </div>

                            {error && (
                                <div className="error-message" role="alert">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 8v4M12 16h.01" />
                                    </svg>
                                    {error}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isInputValid}
                            className={`submit-btn ${loading || !isInputValid ? 'disabled' : 'active'}`}
                        >
                            <span className="btn-content">
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify Identity
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </span>
                        </button>

                        <button type="button" onClick={() => setStep(1)} className="back-btn">
                            Change verification method
                        </button>

                        <div className="trust-footer">
                            <div className="trust-badges">
                                <span className="trust-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--verdant)" strokeWidth="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    256-bit SSL
                                </span>
                                <span className="trust-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--verdant)" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                    Encrypted
                                </span>
                                <span className="trust-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--verdant)" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    Verified
                                </span>
                            </div>
                        </div>
                    </form>
                )}

                {/* Step 3: Confirm Identity */}
                {step === 3 && doctorData && (
                    <div className="animate-in">
                        <div className="wizard-header">
                            <div className="success-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--verdant)" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h2 className="wizard-title">Identity Verified</h2>
                            <p className="wizard-subtitle">
                                We found your record in the registry
                            </p>
                        </div>

                        <div className="doctor-card">
                            <div className="doctor-info">
                                <div className="doctor-avatar">
                                    {doctorData.fullName.charAt(0)}
                                </div>
                                <div className="doctor-details">
                                    <h3>{doctorData.fullName}</h3>
                                    <div className="doctor-status">
                                        <span className="status-dot"></span>
                                        Active License - {doctorData.specialty}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleClaim} disabled={loading} className="confirm-btn">
                            <span className="btn-content">
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Claiming Profile...
                                    </>
                                ) : (
                                    <>
                                        Confirm & Claim Profile
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </span>
                        </button>

                        <button onClick={() => setStep(2)} className="back-btn">
                            Not you? Go back and try again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
