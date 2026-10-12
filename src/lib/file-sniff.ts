/**
 * Detect upload type from magic bytes (never trust client-supplied file.type).
 */
export type SniffedType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';

export function sniffFileType(buf: Uint8Array): SniffedType | null {
    if (buf.length < 12) return null;
    const ascii = (start: number, len: number) =>
        String.fromCharCode(...buf.subarray(start, start + len));
    if (ascii(0, 5) === '%PDF-') return 'application/pdf';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) return 'image/png';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
    return null;
}
