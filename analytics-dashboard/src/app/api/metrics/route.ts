import { register, collectDefaultMetrics } from 'prom-client';

// Initialize default metrics
// We need to ensure this is only called once
if (register.getMetricsAsArray().length === 0) {
  collectDefaultMetrics({ register });
}

export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    headers: {
      'Content-Type': register.contentType,
      // Avoid caching metrics
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// Force dynamic to prevent static generation
export const dynamic = 'force-dynamic';
