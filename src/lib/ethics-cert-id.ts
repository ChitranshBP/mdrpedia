/**
 * Ethics Certification ID Generator
 * Format: MDR-ETHICS-{YEAR}-{8-char hex}
 */

import crypto from 'node:crypto';

export function generateEthicsCertId(): string {
    const year = new Date().getFullYear();
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `MDR-ETHICS-${year}-${hex}`;
}

/** Validate cert ID format */
export function isValidCertId(certId: string): boolean {
    return /^MDR-ETHICS-\d{4}-[A-F0-9]{8}$/.test(certId);
}
