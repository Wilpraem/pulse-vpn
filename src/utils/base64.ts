const BASE64_PATTERN = /^[A-Za-z0-9+/=\r\n]+$/;

export function looksLikeBase64Subscription(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length > 0 && !trimmed.includes('://') && BASE64_PATTERN.test(trimmed);
}

export function decodeBase64Text(input: string): string {
  const compact = input.replace(/\s+/g, '');
  const atobImpl = globalThis.atob;

  if (typeof atobImpl === 'function') {
    const binary = atobImpl(compact);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(compact, 'base64').toString('utf8');
  }

  throw new Error('Base64 decoding is unavailable in this runtime.');
}
