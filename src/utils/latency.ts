export function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  const left = sorted[middle - 1];
  const right = sorted[middle];
  return left === undefined || right === undefined ? undefined : Math.round((left + right) / 2);
}

export function jitter(values: number[]): number | undefined {
  if (values.length < 2) {
    return undefined;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

export function bestOf(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return Math.min(...values);
}
