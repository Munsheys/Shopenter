/**
 * Query performance monitoring and connection pooling diagnostics
 * Helps identify slow queries and connection exhaustion issues
 */

interface QueryMetric {
  operation: string; // 'find', 'aggregate', 'save', etc.
  collection: string;
  durationMs: number;
  timestamp: number;
  documentCount?: number;
}

const queryMetrics: QueryMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 queries

/**
 * Record a query execution
 */
export function recordQueryMetric(metric: QueryMetric) {
  queryMetrics.push(metric);

  // Keep only recent metrics
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift();
  }

  // Log slow queries (>500ms)
  if (metric.durationMs > 500) {
    console.warn(
      `[SlowQuery] ${metric.collection}.${metric.operation} took ${metric.durationMs}ms`,
      metric.documentCount ? `(${metric.documentCount} docs)` : ''
    );
  }
}

/**
 * Get connection pool diagnostics
 */
export function getPoolDiagnostics() {
  return {
    queryCount: queryMetrics.length,
    avgQueryTime: queryMetrics.length > 0
      ? queryMetrics.reduce((sum, m) => sum + m.durationMs, 0) / queryMetrics.length
      : 0,
    slowQueries: queryMetrics.filter(m => m.durationMs > 500).length,
    lastQuery: queryMetrics[queryMetrics.length - 1],
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics() {
  queryMetrics.length = 0;
}

/**
 * Get query timeline for last N minutes
 */
export function getQueryTimeline(minutes: number = 5) {
  const cutoff = Date.now() - (minutes * 60 * 1000);
  return queryMetrics.filter(m => m.timestamp > cutoff);
}
