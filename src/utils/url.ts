export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    return value;
  }
}

export function parseQuery(queryString: string): Record<string, string> {
  const query = new URLSearchParams(queryString);
  const result: Record<string, string> = {};

  query.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

export function splitHashFragment(input: string): { withoutHash: string; fragment?: string } {
  const hashIndex = input.indexOf('#');
  if (hashIndex === -1) {
    return { withoutHash: input };
  }

  return {
    withoutHash: input.slice(0, hashIndex),
    fragment: input.slice(hashIndex + 1),
  };
}
