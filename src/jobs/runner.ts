/**
 * Job Runner
 *
 * Orchestrates scheduled jobs for:
 * - Periodic membership rechecks
 * - Grace period expiry enforcement
 * - Session cleanup
 */

import { createChildLogger } from '../util/logger.js';
import { runRecheckJob } from './recheck.js';
import { runGraceEnforcementJob } from './grace.js';
import { runSessionCleanupJob, runFlowStateCleanupJob } from './cleanup.js';

const logger = createChildLogger('jobs:runner');

// Job intervals (in milliseconds)
const RECHECK_INTERVAL_MS = 60_000; // 1 minute - actual recheck is per-group interval
const GRACE_INTERVAL_MS = 30_000; // 30 seconds - check for expired grace
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

// Job handles
let recheckInterval: ReturnType<typeof setInterval> | null = null;
let graceInterval: ReturnType<typeof setInterval> | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

// Running state to prevent overlapping executions
let recheckRunning = false;
let graceRunning = false;
let cleanupRunning = false;

/**
 * Start all scheduled jobs
 */
export function startJobs(): void {
  logger.info('Starting scheduled jobs');

  // Start recheck job
  recheckInterval = setInterval(async () => {
    if (recheckRunning) {
      logger.debug('Recheck job still running, skipping');
      return;
    }

    recheckRunning = true;
    try {
      await runRecheckJob();
    } catch (error) {
      logger.error({ error }, 'Recheck job failed');
    } finally {
      recheckRunning = false;
    }
  }, RECHECK_INTERVAL_MS);

  // Start grace enforcement job
  graceInterval = setInterval(async () => {
    if (graceRunning) {
      logger.debug('Grace job still running, skipping');
      return;
    }

    graceRunning = true;
    try {
      await runGraceEnforcementJob();
    } catch (error) {
      logger.error({ error }, 'Grace enforcement job failed');
    } finally {
      graceRunning = false;
    }
  }, GRACE_INTERVAL_MS);

  // Start cleanup job
  cleanupInterval = setInterval(async () => {
    if (cleanupRunning) {
      logger.debug('Cleanup job still running, skipping');
      return;
    }

    cleanupRunning = true;
    try {
      await runSessionCleanupJob();
      await runFlowStateCleanupJob();
    } catch (error) {
      logger.error({ error }, 'Cleanup job failed');
    } finally {
      cleanupRunning = false;
    }
  }, CLEANUP_INTERVAL_MS);

  logger.info({
    recheckIntervalMs: RECHECK_INTERVAL_MS,
    graceIntervalMs: GRACE_INTERVAL_MS,
    cleanupIntervalMs: CLEANUP_INTERVAL_MS,
  }, 'Scheduled jobs started');
}

/**
 * Stop all scheduled jobs
 */
export function stopJobs(): void {
  logger.info('Stopping scheduled jobs');

  if (recheckInterval) {
    clearInterval(recheckInterval);
    recheckInterval = null;
  }

  if (graceInterval) {
    clearInterval(graceInterval);
    graceInterval = null;
  }

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  logger.info('Scheduled jobs stopped');
}

/**
 * Run all jobs immediately (for testing or manual trigger)
 */
export async function runAllJobsNow(): Promise<void> {
  logger.info('Running all jobs immediately');

  await Promise.all([
    runRecheckJob().catch((e) => logger.error({ error: e }, 'Recheck job error')),
    runGraceEnforcementJob().catch((e) => logger.error({ error: e }, 'Grace job error')),
    runSessionCleanupJob().catch((e) => logger.error({ error: e }, 'Cleanup job error')),
  ]);

  logger.info('All jobs completed');
}
