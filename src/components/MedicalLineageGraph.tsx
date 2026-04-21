/**
 * MDRPedia — Medical Lineage Graph (Surgical Pedigree)
 *
 * Visualizes the "academic genealogy" of medical professionals - tracing
 * who trained whom through generations of mentorship. This concept is
 * crucial in medicine because:
 *
 * 1. Surgical techniques are often passed down through hands-on training
 * 2. A surgeon's "lineage" indicates the quality and tradition of their training
 * 3. Many pioneering techniques can be traced through mentor-student chains
 * 4. It shows the interconnected nature of medical knowledge transfer
 *
 * Example: A cardiac surgeon trained by a student of Dr. Michael DeBakey
 * carries forward techniques developed by one of the pioneers of modern
 * cardiovascular surgery.
 */

import React, { useState } from 'react';

interface Person {
    name: string;
    id?: string; // Slug for linking to profile
    title?: string;
}

interface Props {
    doctorName: string;
    mentors: Person[];
    students: Person[];
    className?: string;
}

interface NodePosition {
    x: number;
    y: number;
    name: string;
    id?: string;
    title?: string;
    type: 'self' | 'mentor' | 'student' | 'placeholder';
}

export default function MedicalLineageGraph({ doctorName, mentors, students, className = '' }: Props) {
    const [showExplanation, setShowExplanation] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const width = 600;
    const height = 340;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate node positions
    const nodes: NodePosition[] = [];
    const links: { from: NodePosition; to: NodePosition }[] = [];

    // Center node (self)
    const selfNode: NodePosition = {
        x: centerX,
        y: centerY,
        name: doctorName,
        type: 'self',
    };
    nodes.push(selfNode);

    // Mentor nodes (above)
    const mentorList = mentors.length > 0 ? mentors : [{ name: 'Unknown', id: undefined }];
    const mentorSpacing = Math.min(140, (width - 100) / Math.max(mentorList.length, 1));
    const mentorStartX = centerX - ((mentorList.length - 1) * mentorSpacing) / 2;

    mentorList.forEach((mentor, i) => {
        const node: NodePosition = {
            x: mentorStartX + i * mentorSpacing,
            y: centerY - 100,
            name: mentor.name,
            id: mentor.id,
            title: mentor.title,
            type: mentors.length > 0 ? 'mentor' : 'placeholder',
        };
        nodes.push(node);
        links.push({ from: node, to: selfNode });
    });

    // Student nodes (below)
    const studentList = students.length > 0 ? students : [{ name: 'None recorded', id: undefined }];
    const studentSpacing = Math.min(140, (width - 100) / Math.max(studentList.length, 1));
    const studentStartX = centerX - ((studentList.length - 1) * studentSpacing) / 2;

    studentList.forEach((student, i) => {
        const node: NodePosition = {
            x: studentStartX + i * studentSpacing,
            y: centerY + 100,
            name: student.name,
            id: student.id,
            title: student.title,
            type: students.length > 0 ? 'student' : 'placeholder',
        };
        nodes.push(node);
        links.push({ from: selfNode, to: node });
    });

    // Color scheme — editorial tokens
    const colors = {
        self: 'var(--ink-blue)',
        mentor: 'var(--ink-blue)',
        student: 'var(--verdant)',
        placeholder: 'var(--ink-3)',
    };

    // Generate curved path between two points
    const getCurvedPath = (from: NodePosition, to: NodePosition): string => {
        const midY = (from.y + to.y) / 2;
        return `M ${from.x} ${from.y} Q ${from.x} ${midY} ${(from.x + to.x) / 2} ${midY} Q ${to.x} ${midY} ${to.x} ${to.y}`;
    };

    // Truncate long names
    const truncateName = (name: string, maxLen = 18): string => {
        if (name.length <= maxLen) return name;
        return name.slice(0, maxLen - 3) + '...';
    };

    // Handle node click - navigate to profile
    const handleNodeClick = (node: NodePosition) => {
        if (node.id && node.type !== 'placeholder') {
            window.location.href = `/doctors/${node.id}`;
        }
    };

    return (
        <div className={`lineage-graph-container bg-gradient-to-b from-[#0f0f13] to-[#0a0a0f] border border-white/10 rounded-xl p-5 overflow-hidden ${className}`}>
            {/* Header with Explanation Toggle */}
            <div className="flex items-center justify-center gap-3 mb-2">
                <h3 className="text-white text-sm font-bold uppercase tracking-wider text-center">
                    Medical Lineage
                </h3>
                <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="What is Medical Lineage?"
                    title="What is Medical Lineage?"
                >
                    <span className="text-white/70 text-xs font-bold">?</span>
                </button>
            </div>

            {/* Expandable Explanation */}
            {showExplanation && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4 text-sm">
                    <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        What is Medical Lineage?
                    </h4>
                    <p className="text-white/70 leading-relaxed mb-3">
                        In medicine, knowledge and surgical techniques are passed down through <strong className="text-white">direct mentorship</strong>.
                        A physician's "lineage" traces who trained them and who they've trained, creating a
                        chain of knowledge transfer spanning generations.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                            <div>
                                <span className="text-blue-400 font-medium">Mentors</span>
                                <p className="text-white/50">Senior physicians who trained this doctor during residency or fellowship</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                            <div>
                                <span className="text-emerald-400 font-medium">Students</span>
                                <p className="text-white/50">Physicians this doctor has trained, carrying forward their techniques</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-white/50 text-xs mt-3 italic">
                        Click on any name to view their profile and explore the lineage further.
                    </p>
                </div>
            )}

            {!showExplanation && (
                <p className="text-center text-xs text-white/40 mb-4">
                    Tracing the transfer of medical knowledge through mentorship
                </p>
            )}

            {/* Legend */}
            <div className="flex justify-center gap-6 text-xs text-white/60 mb-3">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>Trained By</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500 ring-2 ring-purple-500/30"></span>
                    <span>Subject</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Has Trained</span>
                </div>
            </div>

            {/* SVG Graph */}
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                role="img"
                aria-label={`Medical lineage graph showing mentors and students of ${doctorName}`}
            >
                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="link-gradient-up" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="link-gradient-down" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="nodeGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Direction arrows/labels */}
                <text x={30} y={centerY - 30} fill="#3b82f6" fontSize="9" fontWeight="500" opacity="0.5">
                    LEARNED FROM
                </text>
                <text x={30} y={centerY - 18} fill="#3b82f6" fontSize="8" opacity="0.4">
                    (Mentors)
                </text>
                <path d="M 35 60 L 35 90" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.3" markerEnd="url(#arrowUp)" />

                <text x={30} y={centerY + 25} fill="#10b981" fontSize="9" fontWeight="500" opacity="0.5">
                    TRAINED
                </text>
                <text x={30} y={centerY + 37} fill="#10b981" fontSize="8" opacity="0.4">
                    (Students)
                </text>
                <path d="M 35 255 L 35 285" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.3" markerEnd="url(#arrowDown)" />

                {/* Links with animated gradient */}
                {links.map((link, i) => (
                    <path
                        key={`link-${i}`}
                        d={getCurvedPath(link.from, link.to)}
                        fill="none"
                        stroke={link.from.type === 'self' ? 'url(#link-gradient-down)' : 'url(#link-gradient-up)'}
                        strokeWidth="2.5"
                        strokeOpacity={hoveredNode === link.from.name || hoveredNode === link.to.name ? 1 : 0.5}
                        className="transition-all duration-300"
                    />
                ))}

                {/* Nodes */}
                {nodes.map((node, i) => {
                    const isClickable = node.id && node.type !== 'placeholder' && node.type !== 'self';
                    const isHovered = hoveredNode === node.name;

                    return (
                        <g
                            key={`node-${i}`}
                            className={`transition-all duration-300 ${isClickable ? 'cursor-pointer' : ''}`}
                            onClick={() => isClickable && handleNodeClick(node)}
                            onMouseEnter={() => setHoveredNode(node.name)}
                            onMouseLeave={() => setHoveredNode(null)}
                        >
                            {/* Hover highlight ring */}
                            {isHovered && node.type !== 'placeholder' && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={node.type === 'self' ? 24 : 16}
                                    fill="none"
                                    stroke={colors[node.type]}
                                    strokeWidth="2"
                                    strokeOpacity="0.3"
                                    className="animate-pulse"
                                />
                            )}

                            {/* Outer ring for self */}
                            {node.type === 'self' && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={20}
                                    fill="none"
                                    stroke={colors.self}
                                    strokeWidth="1.5"
                                    strokeOpacity="0.4"
                                />
                            )}

                            {/* Node circle */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.type === 'self' ? 16 : 10}
                                fill={colors[node.type]}
                                stroke="#1a1b26"
                                strokeWidth="3"
                                filter={node.type === 'self' ? 'url(#glow)' : isHovered ? 'url(#nodeGlow)' : undefined}
                                className="transition-all duration-300"
                            />

                            {/* Link icon for clickable nodes */}
                            {isClickable && (
                                <g transform={`translate(${node.x + 12}, ${node.y - 12})`}>
                                    <circle r="6" fill="#1a1b26" />
                                    <path
                                        d="M-2 0 L2 0 M0 -2 L2 0 L0 2"
                                        stroke={colors[node.type]}
                                        strokeWidth="1.5"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </g>
                            )}

                            {/* Label */}
                            <text
                                x={node.x}
                                y={node.type === 'self' ? node.y + 38 : node.type === 'mentor' ? node.y - 20 : node.y + 24}
                                textAnchor="middle"
                                fill={node.type === 'placeholder' ? '#6b7280' : isClickable ? colors[node.type] : '#fff'}
                                fontSize={node.type === 'self' ? '13' : '11'}
                                fontWeight={node.type === 'self' ? '600' : isHovered ? '600' : '400'}
                                fontStyle={node.type === 'placeholder' ? 'italic' : 'normal'}
                                className={`select-none ${isClickable ? 'hover:underline' : ''}`}
                                textDecoration={isHovered && isClickable ? 'underline' : 'none'}
                            >
                                {truncateName(node.name)}
                            </text>

                            {/* Title subtitle for mentors/students */}
                            {node.title && node.type !== 'self' && (
                                <text
                                    x={node.x}
                                    y={node.type === 'mentor' ? node.y - 8 : node.y + 36}
                                    textAnchor="middle"
                                    fill="#6b7280"
                                    fontSize="8"
                                    className="select-none"
                                >
                                    {node.title}
                                </text>
                            )}

                            {/* Role label for self */}
                            {node.type === 'self' && (
                                <text
                                    x={node.x}
                                    y={node.y - 30}
                                    textAnchor="middle"
                                    fill="#8b5cf6"
                                    fontSize="9"
                                    fontWeight="600"
                                    letterSpacing="0.15em"
                                >
                                    SUBJECT
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Stats & Summary */}
            <div className="flex flex-col items-center gap-3 mt-4">
                <div className="flex justify-center gap-8 text-xs">
                    <div className="text-center">
                        <span className="text-blue-400 font-bold text-lg">{mentors.length}</span>
                        <p className="text-white/50">Known Mentor{mentors.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="w-px bg-white/10"></div>
                    <div className="text-center">
                        <span className="text-emerald-400 font-bold text-lg">{students.length}</span>
                        <p className="text-white/50">Trained Student{students.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {(mentors.length > 0 || students.length > 0) && (
                    <p className="text-white/30 text-[10px] text-center max-w-xs">
                        {mentors.length > 0 && students.length > 0
                            ? `${doctorName} continues the lineage, having been trained by ${mentors.length} mentor${mentors.length !== 1 ? 's' : ''} and now training the next generation.`
                            : mentors.length > 0
                            ? `${doctorName} was trained by ${mentors.length} known mentor${mentors.length !== 1 ? 's' : ''}.`
                            : `${doctorName} has trained ${students.length} student${students.length !== 1 ? 's' : ''}, passing on their expertise.`
                        }
                    </p>
                )}
            </div>
        </div>
    );
}
