export async function enqueueReconciliationJob(paymentId: string): Promise<void> {
  const baseUrl = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!baseUrl || !token) {
    return;
  }

  try {
    await fetch(`${baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['LPUSH', 'queue:payments:reconcile', paymentId],
        ['LTRIM', 'queue:payments:reconcile', 0, 999],
      ]),
    });
  } catch (error) {
    console.error('Failed to enqueue reconciliation job', error);
  }
}
