/**
 * MDRPedia — Empty State Component
 * Reusable component for displaying empty/no-data states
 */

import React from 'react';

interface EmptyStateProps {
    /** Icon to display (defaults to search icon) */
    icon?: 'search' | 'document' | 'users' | 'inbox' | 'chart' | 'calendar' | 'folder';
    /** Main heading text */
    title: string;
    /** Description text */
    description?: string;
    /** Action button */
    action?: {
        label: string;
        onClick?: () => void;
        href?: string;
    };
    /** Additional CSS classes */
    className?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

const icons = {
    search: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    ),
    document: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    ),
    users: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    inbox: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
        </svg>
    ),
    chart: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    ),
    calendar: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    ),
    folder: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    ),
};

const sizeClasses = {
    sm: {
        container: 'py-8',
        icon: 'w-10 h-10',
        title: 'text-base',
        description: 'text-sm',
        button: 'px-3 py-1.5 text-sm',
    },
    md: {
        container: 'py-12',
        icon: 'w-14 h-14',
        title: 'text-lg',
        description: 'text-sm',
        button: 'px-4 py-2 text-sm',
    },
    lg: {
        container: 'py-16',
        icon: 'w-20 h-20',
        title: 'text-xl',
        description: 'text-base',
        button: 'px-6 py-3 text-base',
    },
};

export default function EmptyState({
    icon = 'search',
    title,
    description,
    action,
    className = '',
    size = 'md',
}: EmptyStateProps) {
    const sizes = sizeClasses[size];

    const ActionButton = () => {
        if (!action) return null;

        const buttonClasses = `${sizes.button} bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900`;

        if (action.href) {
            return (
                <a href={action.href} className={buttonClasses}>
                    {action.label}
                </a>
            );
        }

        return (
            <button onClick={action.onClick} className={buttonClasses}>
                {action.label}
            </button>
        );
    };

    return (
        <div
            className={`flex flex-col items-center justify-center text-center ${sizes.container} ${className}`}
            role="status"
            aria-label={title}
        >
            {/* Icon */}
            <div className={`${sizes.icon} text-gray-500 mb-4`} aria-hidden="true">
                {icons[icon]}
            </div>

            {/* Title */}
            <h3 className={`${sizes.title} font-semibold text-white mb-2`}>
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className={`${sizes.description} text-gray-400 max-w-sm mb-6`}>
                    {description}
                </p>
            )}

            {/* Action */}
            <ActionButton />
        </div>
    );
}

// ─── Preset Empty States ─────────────────────────────────────────────────────

export function NoSearchResults({ query }: { query?: string }) {
    return (
        <EmptyState
            icon="search"
            title="No results found"
            description={query ? `We couldn't find any results for "${query}". Try adjusting your search terms.` : "Try searching with different keywords."}
        />
    );
}

export function NoData({ title = "No data available" }: { title?: string }) {
    return (
        <EmptyState
            icon="chart"
            title={title}
            description="There's no data to display yet. Check back later."
        />
    );
}

export function NoProfiles() {
    return (
        <EmptyState
            icon="users"
            title="No profiles found"
            description="No doctor profiles match your criteria. Try broadening your search."
            action={{
                label: "Browse all doctors",
                href: "/doctors",
            }}
        />
    );
}

export function NoNews() {
    return (
        <EmptyState
            icon="document"
            title="No news articles"
            description="There are no news articles to display at the moment."
        />
    );
}

export function NoPendingItems() {
    return (
        <EmptyState
            icon="inbox"
            title="All caught up!"
            description="There are no pending items requiring your attention."
            size="sm"
        />
    );
}

export function NoImportJobs() {
    return (
        <EmptyState
            icon="folder"
            title="No import jobs"
            description="You haven't run any bulk import jobs yet."
            action={{
                label: "Start import",
                href: "/admin/bulk-import",
            }}
            size="sm"
        />
    );
}

export function NoAnalytics() {
    return (
        <EmptyState
            icon="chart"
            title="No analytics data"
            description="Analytics data will appear here once you have some traffic."
            size="sm"
        />
    );
}
