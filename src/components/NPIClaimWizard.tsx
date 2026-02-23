import React, { useState, useEffect } from 'react';
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
        const color = isCompleted ? '#10b981' : isActive ? '#a855f7' : '#4b5563';
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
                    background: linear-gradient(145deg, rgba(30, 30, 45, 0.95), rgba(20, 20, 35, 0.98));
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 24px;
                    padding: 2.5rem;
                    backdrop-filter: blur(20px);
                    box-shadow:
                        0 0 0 1px rgba(139, 92, 246, 0.1),
                        0 25px 50px -12px rgba(0, 0, 0, 0.5),
                        0 0 100px -20px rgba(139, 92, 246, 0.3);
                    position: relative;
                    overflow: hidden;
                }

                .wizard-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
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
                    background: rgba(75, 85, 99, 0.5);
                    transform: translateY(-50%);
                    z-index: 0;
                }

                .progress-line-fill {
                    position: absolute;
                    top: 50%;
                    left: 2rem;
                    height: 2px;
                    background: linear-gradient(90deg, #a855f7, #8b5cf6);
                    transform: translateY(-50%);
                    z-index: 1;
                    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
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
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .step-circle.inactive {
                    background: rgba(30, 30, 45, 0.9);
                    border: 2px solid rgba(75, 85, 99, 0.5);
                }

                .step-circle.active {
                    background: linear-gradient(135deg, #a855f7, #8b5cf6);
                    border: 2px solid transparent;
                    box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
                }

                .step-circle.completed {
                    background: linear-gradient(135deg, #10b981, #059669);
                    border: 2px solid transparent;
                }

                .step-label {
                    font-size: 0.6rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #6b7280;
                }

                .step-label.active { color: #a855f7; }
                .step-label.completed { color: #10b981; }

                /* Header */
                .wizard-header {
                    text-align: center;
                    margin-bottom: 1.75rem;
                }

                .wizard-icon {
                    width: 56px;
                    height: 56px;
                    margin: 0 auto 1rem;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.05));
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }

                .wizard-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: white;
                    margin: 0 0 0.5rem;
                }

                .wizard-subtitle {
                    font-size: 0.875rem;
                    color: #9ca3af;
                    margin: 0;
                    line-height: 1.5;
                }

                /* Method Selection */
                .method-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .method-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.25rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }

                .method-btn:hover {
                    background: rgba(139, 92, 246, 0.1);
                    border-color: rgba(139, 92, 246, 0.3);
                }

                .method-icon {
                    width: 40px;
                    height: 40px;
                    background: rgba(139, 92, 246, 0.15);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .method-icon svg {
                    width: 20px;
                    height: 20px;
                    color: #a855f7;
                }

                .method-info {
                    flex: 1;
                }

                .method-label {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: white;
                    display: block;
                    margin-bottom: 2px;
                }

                .method-country {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                .method-arrow {
                    color: #4b5563;
                    transition: transform 0.2s, color 0.2s;
                }

                .method-btn:hover .method-arrow {
                    color: #a855f7;
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
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.625rem;
                }

                .input-wrapper {
                    position: relative;
                    margin-bottom: 0.625rem;
                }

                .reg-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(75, 85, 99, 0.3);
                    border-radius: 14px;
                    padding: 1rem 1.25rem 1rem 3.25rem;
                    font-size: 1.25rem;
                    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    color: white;
                    text-align: center;
                    transition: all 0.3s;
                    outline: none;
                }

                .reg-input::placeholder {
                    color: #4b5563;
                    font-weight: 400;
                    letter-spacing: 0.02em;
                    font-size: 1rem;
                }

                .reg-input:focus {
                    border-color: rgba(139, 92, 246, 0.5);
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
                }

                .reg-input.valid {
                    border-color: rgba(16, 185, 129, 0.5);
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
                }

                .reg-input.error {
                    border-color: rgba(239, 68, 68, 0.5);
                }

                .input-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6b7280;
                }

                .input-icon.focused { color: #a855f7; }
                .input-icon.valid { color: #10b981; }

                /* Progress Bar */
                .progress-bar-container {
                    height: 4px;
                    background: rgba(75, 85, 99, 0.3);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 0.625rem;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #a855f7, #8b5cf6);
                    border-radius: 2px;
                    transition: width 0.2s ease-out;
                }

                .progress-bar-fill.complete {
                    background: linear-gradient(90deg, #10b981, #059669);
                }

                /* Input Meta */
                .input-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.7rem;
                }

                .valid-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: #10b981;
                    font-weight: 600;
                }

                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: #ef4444;
                    font-size: 0.8rem;
                    margin-top: 0.625rem;
                    padding: 0.625rem 0.875rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 10px;
                }

                /* Buttons */
                .submit-btn {
                    width: 100%;
                    padding: 1rem 1.75rem;
                    border: none;
                    border-radius: 14px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .submit-btn.disabled {
                    background: rgba(75, 85, 99, 0.3);
                    color: #6b7280;
                    cursor: not-allowed;
                }

                .submit-btn.active {
                    background: linear-gradient(135deg, #a855f7, #7c3aed);
                    color: white;
                    box-shadow: 0 10px 30px -10px rgba(168, 85, 247, 0.5);
                }

                .submit-btn.active:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 40px -10px rgba(168, 85, 247, 0.6);
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
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
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
                    color: #6b7280;
                    font-size: 0.8rem;
                    cursor: pointer;
                    margin-top: 0.625rem;
                }

                .back-btn:hover { color: white; }

                /* Trust Footer */
                .trust-footer {
                    margin-top: 1.25rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(75, 85, 99, 0.2);
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
                    color: #6b7280;
                }

                .trust-text {
                    text-align: center;
                    font-size: 0.65rem;
                    color: #4b5563;
                    line-height: 1.5;
                }

                .trust-link {
                    color: #8b5cf6;
                    text-decoration: none;
                }

                /* Step 3: Confirmation */
                .success-icon {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 1.25rem;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid rgba(16, 185, 129, 0.3);
                    animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes scale-in {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .doctor-card {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.02));
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 14px;
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
                    background: linear-gradient(135deg, #a855f7, #7c3aed);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: white;
                }

                .doctor-details h3 {
                    margin: 0 0 0.25rem;
                    font-size: 1rem;
                    font-weight: 700;
                    color: white;
                }

                .doctor-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #10b981;
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                }

                .confirm-btn {
                    width: 100%;
                    padding: 1rem 1.75rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    border: none;
                    border-radius: 14px;
                    color: white;
                    font-size: 0.875rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    cursor: pointer;
                    box-shadow: 0 10px 30px -10px rgba(16, 185, 129, 0.5);
                    transition: all 0.3s;
                }

                .confirm-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 40px -10px rgba(16, 185, 129, 0.6);
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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
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
                                <span style={{ color: '#6b7280' }}>
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
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    256-bit SSL
                                </span>
                                <span className="trust-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                    Encrypted
                                </span>
                                <span className="trust-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
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
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
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
