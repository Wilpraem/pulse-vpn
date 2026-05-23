export async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      if (item !== undefined) {
        results[currentIndex] = await worker(item, currentIndex);
      }
    }
  }

  const workers = Array.from({ length: Math.min(safeConcurrency, items.length) }, runWorker);
  await Promise.all(workers);
  return results;
}
