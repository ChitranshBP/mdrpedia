import React, { useState } from 'react';
import { useToast } from './Toast';
import { slugify } from '../lib/utils';

interface PersonSelection {
    fullName: string;
    slug?: string;
}

interface LineageMapperProps {
    onLinkCreated?: (mentor: PersonSelection, student: PersonSelection) => void;
}

export default function LineageMapper({ onLinkCreated }: LineageMapperProps) {
    const [mentor, setMentor] = useState<PersonSelection | null>(null);
    const [student, setStudent] = useState<PersonSelection | null>(null);
    const [loading, setLoading] = useState(false);

    // Try to use toast, fallback gracefully if not in provider
    let toast: ReturnType<typeof useToast> | null = null;
    try {
        toast = useToast();
    } catch {
        // Not wrapped in ToastProvider
    }

    const handleLink = async () => {
        if (!mentor || !student) return;

        setLoading(true);
        try {
            const res = await fetch('/api/admin/lineage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mentorSlug: slugify(mentor.fullName),
                    studentSlug: slugify(student.fullName)
                })
            });
            const data = await res.json();

            if (data.success) {
                toast?.success(data.message || 'Lineage link created successfully!');
                onLinkCreated?.(mentor, student);
                setMentor(null);
                setStudent(null);
            } else {
                toast?.error(data.message || 'Failed to create lineage link');
            }
        } catch {
            toast?.error('Failed to link profiles. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">🧬</span> Lineage Mapper
            </h2>

            <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Mentor Slot */}
                <div className="flex-1 w-full relative group">
                    <label className="block text-xs uppercase tracking-wider text-purple-400 mb-2 font-bold">
                        Source (Mentor)
                    </label>
                    {mentor ? (
                        <div className="bg-purple-900/30 border border-purple-500/50 p-4 rounded-lg flex justify-between items-center">
                            <span className="font-bold text-white">{mentor.fullName}</span>
                            <button onClick={() => setMentor(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                    ) : (
                        <div className="p-4 bg-black/20 rounded-lg border border-dashed border-gray-700 text-center text-gray-500 hover:border-purple-500 transition-colors">
                            Select Mentor
                            {/* In a real implementation, we'd use the Autocomplete here */}
                            <input
                                type="text"
                                className="mt-2 w-full bg-transparent border-b border-gray-600 focus:border-purple-500 outline-none text-white text-center"
                                placeholder="Search Name..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setMentor({ fullName: e.currentTarget.value });
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Connection Icon */}
                <div className="flex flex-col items-center justify-center">
                    <div className="h-8 w-px bg-gray-600"></div>
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white border border-gray-600 z-10">
                        ⬇
                    </div>
                    <div className="h-8 w-px bg-gray-600"></div>
                </div>

                {/* Student Slot */}
                <div className="flex-1 w-full relative group">
                    <label className="block text-xs uppercase tracking-wider text-blue-400 mb-2 font-bold">
                        Target (Student)
                    </label>
                    {student ? (
                        <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg flex justify-between items-center">
                            <span className="font-bold text-white">{student.fullName}</span>
                            <button onClick={() => setStudent(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                    ) : (
                        <div className="p-4 bg-black/20 rounded-lg border border-dashed border-gray-700 text-center text-gray-500 hover:border-blue-500 transition-colors">
                            Select Student
                            <input
                                type="text"
                                className="mt-2 w-full bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none text-white text-center"
                                placeholder="Search Name..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setStudent({ fullName: e.currentTarget.value });
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <button
                    onClick={handleLink}
                    disabled={!mentor || !student || loading}
                    className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all ${
                        !mentor || !student || loading
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-1'
                    }`}
                    aria-busy={loading}
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Linking...
                        </span>
                    ) : 'Link Profiles'}
                </button>
            </div>

            <p className="text-center text-xs text-gray-600 mt-4">
                This will update the Neo4j graph and re-calculate PageRank.
            </p>
        </div>
    );
}
