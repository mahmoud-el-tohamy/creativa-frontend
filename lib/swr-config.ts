// SWR Configuration for global fetch caching

export const swrConfig = {
  // PERF: Cache for 30 seconds — prevents refetch on quick navigation
  dedupingInterval: 30000,
  // Don't refetch when window regains focus (too aggressive for this app)
  revalidateOnFocus: false,
  // Retry failed requests up to 2 times
  errorRetryCount: 2,
  errorRetryInterval: 2000,
  // Keep previous data visible while revalidating (no flash of empty)
  keepPreviousData: true,
};
