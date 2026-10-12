/**
 * MDRPedia — Medical Lineage Graph (Surgical Pedigree)
 *
 * Visualizes the "academic genealogy" of medical professionals - tracing
 * who trained whom through generations of mentorship. Mentor and student
 * nodes are real links to their profiles, so they work for keyboard and
 * assistive technology users and are crawlable.
 */

import { useState } from 'react';
import styles from './MedicalLineageGraph.module.css';

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

const NODE_FILL: Record<NodePosition['type'], string> = {
    self: 'var(--ink)',
    mentor: 'var(--ink-blue)',
    student: 'var(--verdant)',
    placeholder: 'var(--ink-3)',
};

const truncateName = (name: string, maxLen = 18): string =>
    name.length <= maxLen ? name : name.slice(0, maxLen - 3) + '...';

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

export default function MedicalLineageGraph({ doctorName, mentors, students, className = '' }: Props) {
    const [showExplanation, setShowExplanation] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const width = 600;
    const height = 340;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodes: NodePosition[] = [];
    const links: { from: NodePosition; to: NodePosition }[] = [];

    const selfNode: NodePosition = { x: centerX, y: centerY, name: doctorName, type: 'self' };
    nodes.push(selfNode);

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

    const getCurvedPath = (from: NodePosition, to: NodePosition): string => {
        const midY = (from.y + to.y) / 2;
        return `M ${from.x} ${from.y} Q ${from.x} ${midY} ${(from.x + to.x) / 2} ${midY} Q ${to.x} ${midY} ${to.x} ${to.y}`;
    };

    const renderNode = (node: NodePosition, i: number) => {
        const isLink = !!node.id && node.type !== 'placeholder' && node.type !== 'self';
        const isHovered = hoveredNode === node.name;
        const labelY = node.type === 'self' ? node.y + 38 : node.type === 'mentor' ? node.y - 20 : node.y + 24;
        const labelClass = [
            styles.label,
            node.type === 'self' ? styles.labelSelf : '',
            node.type === 'placeholder' ? styles.labelPlaceholder : '',
            isLink ? styles.labelLink : '',
        ].join(' ');

        const content = (
            <>
                {isHovered && node.type !== 'placeholder' && (
                    <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.type === 'self' ? 24 : 16}
                        fill="none"
                        stroke={NODE_FILL[node.type]}
                        strokeWidth="2"
                        strokeOpacity="0.3"
                    />
                )}
                {node.type === 'self' && (
                    <circle cx={node.x} cy={node.y} r={20} fill="none" stroke={NODE_FILL.self} strokeWidth="1.5" strokeOpacity="0.4" />
                )}
                <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.type === 'self' ? 16 : 10}
                    fill={NODE_FILL[node.type]}
                    className={styles.nodeCircle}
                />
                <text x={node.x} y={labelY} textAnchor="middle" className={labelClass}>
                    {truncateName(node.name)}
                </text>
                {node.title && node.type !== 'self' && (
                    <text
                        x={node.x}
                        y={node.type === 'mentor' ? node.y - 8 : node.y + 36}
                        textAnchor="middle"
                        className={styles.subtitle}
                    >
                        {truncateName(node.title, 24)}
                    </text>
                )}
                {node.type === 'self' && (
                    <text x={node.x} y={node.y - 30} textAnchor="middle" className={styles.subjectTag}>
                        SUBJECT
                    </text>
                )}
            </>
        );

        const hoverProps = {
            onMouseEnter: () => setHoveredNode(node.name),
            onMouseLeave: () => setHoveredNode(null),
            onFocus: () => setHoveredNode(node.name),
            onBlur: () => setHoveredNode(null),
        };

        if (isLink) {
            return (
                <a key={`node-${i}`} href={`/doctors/${node.id}`} className={styles.nodeLink} {...hoverProps}>
                    <title>{`${node.name} — view profile`}</title>
                    {content}
                </a>
            );
        }
        return (
            <g key={`node-${i}`} {...hoverProps}>
                {content}
            </g>
        );
    };

    return (
        <div className={`${styles.container} ${className}`}>
            <div className={styles.header}>
                <h2 className={styles.title}>Medical Lineage</h2>
                <button
                    type="button"
                    onClick={() => setShowExplanation(!showExplanation)}
                    className={styles.helpButton}
                    aria-label="What is Medical Lineage?"
                    aria-expanded={showExplanation}
                    aria-controls="lineage-explanation"
                >
                    ?
                </button>
            </div>

            {showExplanation ? (
                <div id="lineage-explanation" className={styles.explanation}>
                    <p>
                        In medicine, knowledge and surgical techniques are passed down through <strong>direct mentorship</strong>.
                        A physician's lineage traces who trained them and who they've trained, creating a
                        chain of knowledge transfer spanning generations.
                    </p>
                    <ul className={styles.explanationList}>
                        <li><strong>Mentors:</strong> senior physicians who trained this doctor during residency or fellowship.</li>
                        <li><strong>Students:</strong> physicians this doctor has trained, carrying forward their techniques.</li>
                    </ul>
                    <p className={styles.explanationNote}>Select any name to view their profile and explore the lineage further.</p>
                </div>
            ) : (
                <p className={styles.tagline}>Tracing the transfer of medical knowledge through mentorship</p>
            )}

            <ul className={styles.legend}>
                <li><span className={styles.dot} style={{ background: 'var(--ink-blue)' }} />Trained By</li>
                <li><span className={styles.dot} style={{ background: 'var(--ink)' }} />Subject</li>
                <li><span className={styles.dot} style={{ background: 'var(--verdant)' }} />Has Trained</li>
            </ul>

            <svg
                viewBox={`0 0 ${width} ${height}`}
                className={styles.svg}
                role="group"
                aria-label={`Medical lineage of ${doctorName}: ${plural(mentors.length, 'mentor')}, ${plural(students.length, 'student')}`}
            >
                {links.map((link, i) => (
                    <path
                        key={`link-${i}`}
                        d={getCurvedPath(link.from, link.to)}
                        fill="none"
                        stroke={link.from.type === 'self' ? 'var(--verdant)' : 'var(--ink-blue)'}
                        strokeWidth="2.5"
                        strokeOpacity={hoveredNode === link.from.name || hoveredNode === link.to.name ? 1 : 0.45}
                    />
                ))}
                {nodes.map(renderNode)}
            </svg>

            <div className={styles.stats}>
                <div>
                    <span className={styles.statValue}>{mentors.length}</span>
                    <p>Known Mentor{mentors.length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                    <span className={`${styles.statValue} ${styles.statValueStudents}`}>{students.length}</span>
                    <p>Trained Student{students.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {(mentors.length > 0 || students.length > 0) && (
                <p className={styles.summary}>
                    {mentors.length > 0 && students.length > 0
                        ? `${doctorName} continues the lineage, having been trained by ${plural(mentors.length, 'mentor')} and now training the next generation.`
                        : mentors.length > 0
                        ? `${doctorName} was trained by ${plural(mentors.length, 'known mentor')}.`
                        : `${doctorName} has trained ${plural(students.length, 'student')}, passing on their expertise.`}
                </p>
            )}
        </div>
    );
}
