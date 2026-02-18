import React, { useState } from 'react';
import { useToast } from './Toast';
import { isValidNPI } from '../lib/utils';

interface DoctorVerificationData {
    fullName: string;
    specialty: string;
    npi?: string;
    credential?: string;
}

interface NPIClaimWizardProps {
    onSuccess?: (doctor: DoctorVerificationData) => void;
}

export default function NPIClaimWizard({ onSuccess }: NPIClaimWizardProps) {
    const [step, setStep] = useState(1);
    const [npi, setNpi] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [doctorData, setDoctorData] = useState<DoctorVerificationData | null>(null);

    // Try to use toast, fallback gracefully if not in provider
    let toast: ReturnType<typeof useToast> | null = null;
    try {
        toast = useToast();
    } catch {
        // Not wrapped in ToastProvider, will use inline messages
    }

    // Validate NPI format as user types
    const isNpiValid = isValidNPI(npi);
    const showNpiFormatError = npi.length > 0 && npi.length < 10 && !/^\d*$/.test(npi);

    const handleNpiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isNpiValid) {
            setError('Please enter a valid 10-digit NPI number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/npi-validate?npi=${npi}`);
            const data = await res.json();

            if (data.valid) {
                setDoctorData(data.doctor);
                setStep(2);
                toast?.success('Identity verified successfully!');
            } else {
                setError(data.message || 'Invalid NPI Number');
                toast?.error(data.message || 'Invalid NPI Number');
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
            // Here we would create the user account via API
            toast?.success(`Profile for ${doctorData.fullName} claimed! Redirecting...`);
            onSuccess?.(doctorData);

            // Short delay for user to see the success message
            setTimeout(() => {
                window.location.href = '/doctor/portal';
            }, 1500);
        } catch {
            toast?.error('Failed to claim profile. Please try again.');
            setLoading(false);
        }
    };

    const handleNpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numeric input
        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
        setNpi(value);
        if (error) setError('');
    };

    return (
        <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
            {/* Progress Bar */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10"></div>
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-800 text-gray-500'
                        }`}>
                        {s}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <form onSubmit={handleNpiSubmit} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Claim Your Profile</h2>
                        <p className="text-gray-400 text-sm">Enter your 10-digit NPI number to verify your identity.</p>
                    </div>

                    <div>
                        <label
                            htmlFor="npi-input"
                            className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide"
                        >
                            Professional ID / NPI
                        </label>
                        <input
                            id="npi-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={npi}
                            onChange={handleNpiChange}
                            className={`w-full bg-black/20 border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-lg tracking-widest text-center transition-colors ${error || showNpiFormatError
                                    ? 'border-red-500/50 focus:ring-red-500'
                                    : isNpiValid
                                        ? 'border-green-500/50'
                                        : 'border-white/10'
                                }`}
                            placeholder="Enter 10-digit NPI"
                            aria-describedby="npi-hint npi-error"
                            aria-invalid={!!error || showNpiFormatError}
                            maxLength={10}
                            autoComplete="off"
                        />
                        <p id="npi-hint" className="text-gray-500 text-xs mt-1 text-center">
                            {npi.length}/10 digits {isNpiValid && <span className="text-green-400">Valid format</span>}
                        </p>
                        {(error || showNpiFormatError) && (
                            <p id="npi-error" className="text-red-400 text-xs mt-2 text-center" role="alert">
                                {error || 'NPI must contain only numbers'}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isNpiValid}
                        className={`w-full py-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all border ${loading || !isNpiValid
                                ? 'bg-gray-800/50 text-gray-600 border-gray-700 cursor-not-allowed hidden-interact'
                                : 'bg-white text-purple-900 border-white hover:bg-purple-50 shadow-lg shadow-white/10'
                            }`}
                        aria-busy={loading}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Verifying...
                            </span>
                        ) : (
                            <span className={!isNpiValid ? 'opacity-50' : ''}>
                                {!isNpiValid && npi.length > 0 ? 'Enter Complete NPI' : 'Verify Identity'}
                            </span>
                        )}
                    </button>

                    <p className="text-center text-[10px] text-gray-600 mt-4">
                        By continuing, you agree to MDRPedia's Terms of Service.
                        Protected by Cloudflare Turnstile.
                    </p>
                </form>
            )}

            {step === 2 && doctorData && (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Identity Verified</h2>
                        <p className="text-gray-400 text-sm">We found your record.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-lg font-bold text-white">
                                {doctorData.fullName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{doctorData.fullName}</h3>
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                    Active License • {doctorData.specialty}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleClaim}
                        className="w-full py-4 rounded-lg font-bold text-sm uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all"
                    >
                        Confirm & Claim Profile
                    </button>
                    <button
                        onClick={() => setStep(1)}
                        className="w-full py-2 text-xs text-gray-500 hover:text-white"
                    >
                        Not you? Go back
                    </button>
                </div>
            )}
        </div>
    );
}
