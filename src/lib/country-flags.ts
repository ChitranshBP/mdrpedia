/**
 * Country name → ISO 3166-1 alpha-2 code mapping
 * Used to convert full country names from doctor profiles to flag emojis
 */

const COUNTRY_CODES: Record<string, string> = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR",
    "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ",
    "Bahrain": "BH", "Bangladesh": "BD", "Belarus": "BY", "Belgium": "BE",
    "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Brazil": "BR",
    "Bulgaria": "BG", "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA",
    "Chile": "CL", "China": "CN", "Colombia": "CO", "Costa Rica": "CR",
    "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czech Republic": "CZ",
    "Czechia": "CZ", "Denmark": "DK", "Dominican Republic": "DO",
    "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Estonia": "EE",
    "Ethiopia": "ET", "Finland": "FI", "France": "FR", "Georgia": "GE",
    "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Guatemala": "GT",
    "Honduras": "HN", "Hong Kong": "HK", "Hungary": "HU", "Iceland": "IS",
    "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ",
    "Ireland": "IE", "Israel": "IL", "Italy": "IT", "Jamaica": "JM",
    "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE",
    "Kuwait": "KW", "Latvia": "LV", "Lebanon": "LB", "Libya": "LY",
    "Lithuania": "LT", "Luxembourg": "LU", "Malaysia": "MY", "Malta": "MT",
    "Mexico": "MX", "Moldova": "MD", "Mongolia": "MN", "Morocco": "MA",
    "Mozambique": "MZ", "Myanmar": "MM", "Nepal": "NP", "Netherlands": "NL",
    "New Zealand": "NZ", "Nicaragua": "NI", "Nigeria": "NG", "North Korea": "KP",
    "North Macedonia": "MK", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
    "Palestine": "PS", "Panama": "PA", "Paraguay": "PY", "Peru": "PE",
    "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
    "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saudi Arabia": "SA",
    "Senegal": "SN", "Serbia": "RS", "Singapore": "SG", "Slovakia": "SK",
    "Slovenia": "SI", "South Africa": "ZA", "South Korea": "KR", "Spain": "ES",
    "Sri Lanka": "LK", "Sudan": "SD", "Sweden": "SE", "Switzerland": "CH",
    "Syria": "SY", "Taiwan": "TW", "Tanzania": "TZ", "Thailand": "TH",
    "Tunisia": "TN", "Turkey": "TR", "Türkiye": "TR", "Uganda": "UG",
    "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB",
    "United States": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
    "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM",
    "Zimbabwe": "ZW",
    // Aliases
    "UK": "GB", "USA": "US", "U.S.": "US", "U.S.A.": "US", "U.K.": "GB",
    "Korea": "KR", "Republic of Korea": "KR",
};

/**
 * Convert a 2-letter ISO country code to a flag emoji.
 * Uses Unicode Regional Indicator Symbols.
 */
export function codeToFlag(code: string): string {
    if (!code || code.length !== 2) return "";
    const upper = code.toUpperCase();
    return String.fromCodePoint(
        ...upper.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
}

/**
 * Get the 2-letter ISO code for a country name.
 */
export function countryToCode(country: string): string {
    if (!country) return "";
    return COUNTRY_CODES[country] || COUNTRY_CODES[country.trim()] || "";
}

/**
 * Convert a full country name directly to a flag emoji.
 */
export function countryToFlag(country: string): string {
    return codeToFlag(countryToCode(country));
}
