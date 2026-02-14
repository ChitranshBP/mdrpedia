import React, { useState } from 'react';
import SearchWithAutocomplete from './SearchWithAutocomplete';

interface DoctorDetails {
    slug: string;
    fullName: string;
    specialty: string;
    tier: string;
    portraitUrl?: string;
    hIndex: number;
    verifiedSurgeries: number;
    yearsActive: number;
    livesSaved: number;
    location: string;
    mentors: string[];
    students: string[];
}

export default function ComparisonGrid() {
    const [slots, setSlots] = useState<(DoctorDetails | null)[]>([null, null, null]);
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

    const fetchDoctor = async (slug: string) => {
        try {
            const res = await fetch(`/api/doctor-details?slug=${slug}`);
            const data = await res.json();
            if (data.error) {
                console.error(data.error);
                return null;
            }
            return data;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            setLoadingIndex(0);
            fetchDoctor(id).then(doctor => {
                if (doctor) {
                    setSlots(prev => {
                        const newSlots = [...prev];
                        newSlots[0] = doctor;
                        return newSlots;
                    });
                }
                setLoadingIndex(null);
            });
        }
    }, []);

    const handleSelect = async (index: number, result: any) => {
        setLoadingIndex(index);
        const doctor = await fetchDoctor(result.slug);
        if (doctor) {
            setSlots(prev => {
                const newSlots = [...prev];
                newSlots[index] = doctor;
                return newSlots;
            });
        }
        setLoadingIndex(null);
    };

    const handleRemove = (index: number) => {
        const newSlots = [...slots];
        newSlots[index] = null;
        setSlots(newSlots);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {slots.map((doctor, index) => (
                <div key={index} className={`compare-card relative flex flex-col min-h-[500px] rounded-2xl border ${doctor ? (doctor.tier === 'TITAN' ? 'border-yellow-500/50 bg-[#1a052e]' : 'border-white/10 bg-white/5') : 'border-dashed border-white/20 bg-transparent items-center justify-center'
                    } transition-all duration-300`}>

                    {doctor ? (
                        <div className="flex flex-col h-full p-6">
                            <button
                                onClick={() => handleRemove(index)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            {/* Header */}
                            <div className="flex flex-col items-center mb-6 text-center">
                                <div className={`w-24 h-24 rounded-full mb-4 overflow-hidden border-2 ${doctor.tier === 'TITAN' ? 'border-yellow-500 shadow-[0_0_20px_rgba(255,215,0,0.3)]' : 'border-white/20'
                                    }`}>
                                    {doctor.portraitUrl ? (
                                        <img src={doctor.portraitUrl} alt={doctor.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-2xl font-bold text-white/50">
                                            {doctor.fullName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <h3 className={`text-xl font-bold mb-1 ${doctor.tier === 'TITAN' ? 'text-yellow-400' : 'text-white'}`}>
                                    {doctor.fullName}
                                </h3>
                                <p className="text-sm text-white/60 mb-2">{doctor.specialty}</p>
                                {doctor.tier === 'TITAN' && (
                                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-yellow-900 bg-yellow-400 rounded">TITAN</span>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="space-y-4 flex-1">
                                <StatRow label="H-Index" value={doctor.hIndex} highlight={doctor.hIndex > 50} />
                                <StatRow label="Verified Surgeries" value={doctor.verifiedSurgeries.toLocaleString()} />
                                <StatRow label="Years Active" value={doctor.yearsActive} />
                                <StatRow label="Lives Impacted" value={doctor.livesSaved > 0 ? doctor.livesSaved.toLocaleString() : 'N/A'} />
                            </div>

                            {/* Lineage */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Pedigree</p>
                                <div className="text-sm">
                                    <span className="text-white/60">Mentored by: </span>
                                    <span className="text-white">{doctor.mentors.length ? doctor.mentors.join(', ') : 'Unknown'}</span>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="w-full p-6 text-center">
                            {loadingIndex === index ? (
                                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/20">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">Add Specialist</h3>
                                    <p className="text-sm text-white/40 mb-6">Compare clinical authority metrics</p>
                                    <div className="relative">
                                        <SearchWithAutocomplete onSelect={(r) => handleSelect(index, r)} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function StatRow({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
            <span className="text-sm text-white/60">{label}</span>
            <span className={`font-mono font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>
                {value}
            </span>
        </div>
    );
}
