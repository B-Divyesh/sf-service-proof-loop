export function assertRateBurst(
  responses,
  { requests, maximumAllowed = 42, minimumLimited },
) {
  if (responses.length !== requests) {
    throw new Error(`rate probe received ${responses.length} responses for ${requests} requests`);
  }

  const statuses = responses.map(response => response.status);
  const allowed = statuses.filter(status => status !== 429).length;
  const limited = statuses.filter(status => status === 429).length;
  const evidence = { requests, allowed, limited };

  if (!statuses.every(status => status === 404 || status === 429)) {
    throw new Error(`rate probe returned an unexpected response: ${JSON.stringify({ ...evidence, statuses })}`);
  }
  if (allowed > maximumAllowed || limited < minimumLimited) {
    throw new Error(`rate allowance exceeds one replica plus two refill tokens: ${JSON.stringify(evidence)}`);
  }
  if (responses.some(response => response.status === 429 && response.retryAfter !== '1')) {
    throw new Error(`429 response omitted Retry-After: 1: ${JSON.stringify(evidence)}`);
  }

  return evidence;
}
