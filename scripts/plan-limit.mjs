export function assertConcurrentFreePlan(statuses) {
  if (statuses.length !== 8) {
    throw new Error(`free-plan probe received ${statuses.length} responses instead of 8`);
  }

  const created = statuses.filter(status => status === 201).length;
  const limited = statuses.filter(status => status === 402).length;
  const unauthorized = statuses.filter(status => status === 401).length;
  const evidence = { created, limited, unauthorized, statuses };

  if (unauthorized > 0) {
    throw new Error(`free-plan writes lost workspace authorization across writers: ${JSON.stringify(evidence)}`);
  }
  if (created !== 3 || limited !== 5 || statuses.some(status => status !== 201 && status !== 402)) {
    throw new Error(`concurrent free-plan allowance was not atomic: ${JSON.stringify(evidence)}`);
  }

  return { created, limited, unauthorized };
}
