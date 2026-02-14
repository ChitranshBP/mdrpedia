import React, { useState } from 'react';

export default function NPIClaimWizard() {
    const [step, setStep] = useState(1);
    const [npi, setNpi] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [doctorData, setDoctorData] = useState<any>(null);

    const handleNpiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/npi-validate?npi=${npi}`);
            const data = await res.json();

            if (data.valid) {
                setDoctorData(data.doctor);
                setStep(2);
            } else {
                setError(data.message || 'Invalid NPI Number');
            }
        } catch (err) {
            setError('System Error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = () => {
        // Here we would create the user account
        alert(`Profile for ${doctorData.fullName} claimed! Redirecting to portal...`);
        window.location.href = '/doctor/portal';
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
                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">NPI Number</label>
                        <input
                            type="text"
                            value={npi}
                            onChange={(e) => setNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-lg tracking-widest text-center"
                            placeholder="1234567890"
                        />
                        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || npi.length !== 10}
                        className={`w-full py-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${loading || npi.length !== 10
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-purple-900 hover:bg-purple-100 shadow-xl shadow-white/10'
                            }`}
                    >
                        {loading ? 'Verifying...' : 'Verify Identity'}
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
