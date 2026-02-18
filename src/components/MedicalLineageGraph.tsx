/**
 * MDRPedia — Medical Lineage Graph
 * Lightweight SVG-based visualization (no D3 dependency)
 * Shows mentor-mentee relationships in a simple tree layout
 */

import React from 'react';

interface Props {
    doctorName: string;
    mentors: string[];
    students: string[];
    className?: string;
}

interface NodePosition {
    x: number;
    y: number;
    name: string;
    type: 'self' | 'mentor' | 'student' | 'placeholder';
}

export default function MedicalLineageGraph({ doctorName, mentors, students, className = '' }: Props) {
    const width = 600;
    const height = 320;
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
    const mentorList = mentors.length > 0 ? mentors : ['Unknown'];
    const mentorSpacing = Math.min(120, (width - 100) / mentorList.length);
    const mentorStartX = centerX - ((mentorList.length - 1) * mentorSpacing) / 2;

    mentorList.forEach((mentor, i) => {
        const node: NodePosition = {
            x: mentorStartX + i * mentorSpacing,
            y: centerY - 90,
            name: mentor,
            type: mentors.length > 0 ? 'mentor' : 'placeholder',
        };
        nodes.push(node);
        links.push({ from: node, to: selfNode });
    });

    // Student nodes (below)
    const studentList = students.length > 0 ? students : ['None recorded'];
    const studentSpacing = Math.min(120, (width - 100) / studentList.length);
    const studentStartX = centerX - ((studentList.length - 1) * studentSpacing) / 2;

    studentList.forEach((student, i) => {
        const node: NodePosition = {
            x: studentStartX + i * studentSpacing,
            y: centerY + 90,
            name: student,
            type: students.length > 0 ? 'student' : 'placeholder',
        };
        nodes.push(node);
        links.push({ from: selfNode, to: node });
    });

    // Color scheme
    const colors = {
        self: '#8b5cf6',      // Purple
        mentor: '#3b82f6',    // Blue
        student: '#10b981',   // Green
        placeholder: '#6b7280', // Gray
    };

    // Generate curved path between two points
    const getCurvedPath = (from: NodePosition, to: NodePosition): string => {
        const midY = (from.y + to.y) / 2;
        return `M ${from.x} ${from.y} Q ${from.x} ${midY} ${(from.x + to.x) / 2} ${midY} Q ${to.x} ${midY} ${to.x} ${to.y}`;
    };

    // Truncate long names
    const truncateName = (name: string, maxLen = 20): string => {
        if (name.length <= maxLen) return name;
        return name.slice(0, maxLen - 3) + '...';
    };

    return (
        <div className={`lineage-graph-container bg-[#0f0f13] border border-white/10 rounded-xl p-4 overflow-hidden ${className}`}>
            {/* Header */}
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-0 text-center text-white/50">
                Surgical Pedigree
            </h3>
            <p className="text-center text-[10px] text-white/30 mb-4">
                Tracing the transfer of knowledge through mentorship
            </p>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-[10px] text-white/60 mb-2">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>Subject</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Mentor</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Student</span>
                </div>
            </div>

            {/* SVG Graph */}
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                role="img"
                aria-label={`Medical lineage graph for ${doctorName}`}
            >
                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="link-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
                    </linearGradient>
                    <linearGradient id="link-gradient-down" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Links */}
                {links.map((link, i) => (
                    <path
                        key={`link-${i}`}
                        d={getCurvedPath(link.from, link.to)}
                        fill="none"
                        stroke={link.from.type === 'self' ? '#10b981' : '#3b82f6'}
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        className="transition-all duration-300"
                    />
                ))}

                {/* Nodes */}
                {nodes.map((node, i) => (
                    <g key={`node-${i}`} className="transition-all duration-300">
                        {/* Node circle */}
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.type === 'self' ? 14 : 8}
                            fill={colors[node.type]}
                            stroke="#1a1b26"
                            strokeWidth="3"
                            filter={node.type === 'self' ? 'url(#glow)' : undefined}
                            className="transition-all duration-300 hover:opacity-80"
                        />

                        {/* Outer ring for self */}
                        {node.type === 'self' && (
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={18}
                                fill="none"
                                stroke={colors.self}
                                strokeWidth="1"
                                strokeOpacity="0.3"
                            />
                        )}

                        {/* Label */}
                        <text
                            x={node.x}
                            y={node.type === 'self' ? node.y + 35 : node.type === 'mentor' ? node.y - 18 : node.y + 22}
                            textAnchor="middle"
                            fill={node.type === 'placeholder' ? '#6b7280' : '#fff'}
                            fontSize={node.type === 'self' ? '13' : '11'}
                            fontWeight={node.type === 'self' ? '600' : '400'}
                            fontStyle={node.type === 'placeholder' ? 'italic' : 'normal'}
                            className="select-none"
                        >
                            {truncateName(node.name)}
                        </text>

                        {/* Role label for self */}
                        {node.type === 'self' && (
                            <text
                                x={node.x}
                                y={node.y - 28}
                                textAnchor="middle"
                                fill="#8b5cf6"
                                fontSize="9"
                                fontWeight="500"
                                letterSpacing="0.1em"
                            >
                                SUBJECT
                            </text>
                        )}
                    </g>
                ))}

                {/* Section labels */}
                <text
                    x={50}
                    y={centerY - 90}
                    fill="#3b82f6"
                    fontSize="10"
                    fontWeight="600"
                    opacity="0.6"
                    letterSpacing="0.05em"
                >
                    MENTORS
                </text>
                <text
                    x={50}
                    y={centerY + 90}
                    fill="#10b981"
                    fontSize="10"
                    fontWeight="600"
                    opacity="0.6"
                    letterSpacing="0.05em"
                >
                    STUDENTS
                </text>
            </svg>

            {/* Stats */}
            <div className="flex justify-center gap-6 mt-4 text-xs text-white/50">
                <div>
                    <span className="text-blue-400 font-semibold">{mentors.length}</span> known mentor{mentors.length !== 1 ? 's' : ''}
                </div>
                <div>
                    <span className="text-emerald-400 font-semibold">{students.length}</span> trained student{students.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    );
}
