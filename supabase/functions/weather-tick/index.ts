import { serviceClient, serveJob } from '../_lib/job-runtime.ts';
import { decidePushes } from '../_shared/core.mjs';
import { type Area, getForecast, planForecast, type Thresholds } from './forecast.ts';

type Database = ReturnType<typeof serviceClient>;
type ReportError = (operation: string) => void;
type Claim = { runId: string; enabled: boolean; areas: Area[]; thresholds: Thresholds };
type Counts = { areas: number; forecasts: number; events: number; queued: number; failed: number };
type WeatherPage = { events: Parameters<typeof decidePushes>[0]; installs: { id: string }[] };

async function updateArea(db: Database, area: Area, thresholds: Thresholds, counts: Counts, report: ReportError) {
  let forecast;
  try {
    forecast = await getForecast(area, thresholds);
  } catch {
    counts.failed += 1;
    report('forecast fetch failed');
    const { error } = await db.from('areas').update({ next_fetch_at: new Date(Date.now() + 30 * 60_000).toISOString() })
      .eq('id', area.id).eq('next_fetch_at', area.lease);
    if (error) report('forecast retry scheduling failed');
    return;
  }
  const now = Date.now();
  const plan = planForecast(forecast, area, thresholds, now);
  const { data, error } = await db.rpc('server_store_forecast_v1', {
    area_key: area.id,
    lease: area.lease,
    forecast_data: forecast,
    fetched_at: new Date(now).toISOString(),
    rain_at: plan.lastRain,
    next_fetch: plan.nextFetch,
    events: plan.events,
  });
  if (error) {
    counts.failed += 1;
    report('forecast storage failed');
  } else if (data === true) {
    counts.forecasts += 1;
    counts.events += plan.events.length;
  }
}

async function queueDuePushes(db: Database, counts: Counts, report: ReportError) {
  const tickAt = Date.now();
  let cursor: string | null = null;
  do {
    const page: { data: WeatherPage | null; error: unknown } = await db.rpc('server_weather_push_page_v1', {
      tick_at: new Date(tickAt).toISOString(),
      after_install: cursor,
    });
    if (page.error || !page.data) {
      report('weather push lookup failed');
      throw new Error('Weather push lookup failed');
    }
    const { events, installs } = page.data;
    const decisions = decidePushes(events, installs, tickAt);
    if (decisions.length) {
      const { data, error } = await db.rpc('server_queue_weather_v1', { decisions });
      if (error) {
        report('weather push queue failed');
        throw new Error('Weather push queue failed');
      }
      counts.queued += data;
    }
    cursor = installs.length === 200 ? installs.at(-1)?.id ?? null : null;
  } while (cursor);
}

serveJob('weather-tick', async (report) => {
  const db = serviceClient();
  const { data, error } = await db.rpc('server_claim_weather_v1', { batch_size: 100 });
  if (error) {
    report('weather batch claim failed');
    throw new Error('Weather batch claim failed');
  }
  const claim: Claim = data;
  const counts: Counts = { areas: claim.areas.length, forecasts: 0, events: 0, queued: 0, failed: 0 };
  let aborted = false;
  try {
    // Continue from stored forecasts even when no requests fit the remaining budget.
    const concurrent = 12;
    for (let start = 0; start < claim.areas.length; start += concurrent) {
      await Promise.all(claim.areas.slice(start, start + concurrent).map((area) =>
        updateArea(db, area, claim.thresholds, counts, report)));
    }
    if (claim.enabled) await queueDuePushes(db, counts, report);
  } catch {
    counts.failed += 1;
    aborted = true;
  }
  const finished = await db.from('job_runs').update({ counts, finished_at: new Date().toISOString() }).eq('id', claim.runId);
  if (finished.error) {
    report('weather run logging failed');
    throw new Error('Weather run logging failed');
  }
  if (aborted) throw new Error('Weather tick did not complete');
  return counts;
});
