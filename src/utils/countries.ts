const FLAG_OFFSET = 127397;

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  austria: 'AT',
  czechia: 'CZ',
  germany: 'DE',
  estonia: 'EE',
  finland: 'FI',
  france: 'FR',
  ireland: 'IE',
  italy: 'IT',
  netherlands: 'NL',
  poland: 'PL',
  russia: 'RU',
  singapore: 'SG',
  sweden: 'SE',
  turkey: 'TR',
  uk: 'GB',
  'united kingdom': 'GB',
  usa: 'US',
  'united states': 'US',
};

export function flagToCountryCode(input: string): string | undefined {
  const codePoints = Array.from(input)
    .map((char) => char.codePointAt(0))
    .filter((codePoint): codePoint is number => codePoint !== undefined);

  const regional = codePoints.filter(
    (codePoint) => codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff,
  );

  if (regional.length < 2) {
    return undefined;
  }

  return String.fromCharCode(regional[0] - FLAG_OFFSET, regional[1] - FLAG_OFFSET).toUpperCase();
}

export function countryNameToCode(countryName: string): string | undefined {
  return COUNTRY_NAME_TO_CODE[countryName.trim().toLowerCase()];
}

export function extractCountry(displayName: string): { country?: string; countryCode?: string } {
  const countryCode = flagToCountryCode(displayName);
  const withoutFlag = displayName.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
  const countryMatch = withoutFlag.match(/^([A-Za-z ]+?)(?:\s+[-#]|\s+--|\s+\u2014|\s+\d|$)/u);
  const country = countryMatch?.[1]?.trim();

  return {
    country: country || undefined,
    countryCode: countryCode ?? (country ? countryNameToCode(country) : undefined),
  };
}

export function isForeignCountry(countryCode: string | undefined, localCountryCode: string): boolean {
  if (!countryCode) {
    return false;
  }

  return countryCode.toUpperCase() !== localCountryCode.toUpperCase();
}
