const SPECIAL: Record<string, string> = {
    'ø': 'o', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i', 'ħ': 'h',
};

export function transliterate(text: string): string {
    return text
        .toLowerCase()
        .replace(/[øßæœłđðþıħ]/g, (c) => SPECIAL[c])
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

export function slugify(text: string): string {
    return transliterate(text)
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}
