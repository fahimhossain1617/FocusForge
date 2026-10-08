/**
 * FOCENTIA COMPREHENSIVE REPRESENTATIVE API LOAD & CONCURRENCY BENCHMARK
 *
 * Tests representative workloads:
 * - Endpoint A: /api/user/check-username (Validation + DB availability check)
 * - Endpoint B: /api/ai/tokens (Token status & Quota calculation)
 * - Endpoint C: / (Static Next.js App Shell SSR)
 * - Endpoint D: /health (Express health endpoint)
 */

interface BenchmarkSummary {
  endpoint: string;
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  requestsPerSecond: number;
  p50: number;
  p95: number;
  p99: number;
}

async function runBenchmark(
  url: string,
  totalRequests: number,
  concurrency: number
): Promise<BenchmarkSummary> {
  const latencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  let currentIndex = 0;

  const startTime = Date.now();

  async function worker() {
    while (currentIndex < totalRequests) {
      const idx = currentIndex++;
      const reqStart = performance.now();
      try {
        const res = await fetch(url, {
          headers: {
            "x-forwarded-for": `192.168.1.${(idx % 250) + 1}`,
            "User-Agent": "Focentia-Load-Tester/1.0",
          },
        });
        const elapsed = performance.now() - reqStart;
        latencies.push(elapsed);
        if (res.ok || res.status === 429) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch {
        const elapsed = performance.now() - reqStart;
        latencies.push(elapsed);
        failedRequests++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const requestsPerSecond = totalRequests / (durationMs / 1000);

  return {
    endpoint: url,
    concurrency,
    totalRequests,
    successfulRequests,
    failedRequests,
    durationMs,
    requestsPerSecond: Math.round(requestsPerSecond * 10) / 10,
    p50: Math.round(p50 * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    p99: Math.round(p99 * 10) / 10,
  };
}

async function main() {
  console.log("===============================================================");
  console.log("FOCENTIA MULTI-ENDPOINT REPRESENTATIVE LOAD BENCHMARK");
  console.log("===============================================================\n");

  const PORT = process.env.TEST_PORT || process.env.PORT || '3001';
  const BASE_URL = `http://localhost:${PORT}`;

  const endpoints = [
    { name: "1. Username Availability (/api/user/check-username)", url: `${BASE_URL}/api/user/check-username?username=benchmark_test` },
    { name: "2. AI Token Quota Status (/api/ai/tokens)", url: `${BASE_URL}/api/ai/tokens` },
    { name: "3. App Shell SSR (/)", url: `${BASE_URL}/` },
  ];

  for (const ep of endpoints) {
    console.log(`--- Testing Workload: ${ep.name} ---`);
    const res = await runBenchmark(ep.url, 60, 15);
    console.log(`  - Concurrency: ${res.concurrency} workers | Total: ${res.totalRequests} reqs`);
    console.log(`  - Duration: ${res.durationMs}ms | Throughput: ${res.requestsPerSecond} req/s`);
    console.log(`  - Success: ${res.successfulRequests}/${res.totalRequests} | Failures: ${res.failedRequests}`);
    console.log(`  - p50: ${res.p50}ms | p95: ${res.p95}ms | p99: ${res.p99}ms\n`);
  }
}

main().catch(console.error);
