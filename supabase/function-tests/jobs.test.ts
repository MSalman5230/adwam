import assert from 'node:assert/strict';
import { sendExpoPushes, type PushMessage } from '../functions/_lib/expo-push.ts';
import { getForecast, planForecast } from '../functions/weather-tick/forecast.ts';
import { simulateLocalRain } from './local-install.ts';
import forecastFixture from './fixtures/open-meteo-berlin.json' with { type: 'json' };
import ticketsFixture from './fixtures/expo-tickets.json' with { type: 'json' };

Deno.test('the recorded forecast yields rain events and a faster fetch', async () => {
  const area = { id: '525:134', latitude: 52.5, longitude: 13.4, lease: '' };
  const thresholds = { dryDays: 7, heavyRainMmPerHour: 7.6, windCardKmh: 60, windPushKmh: 75 };
  const forecast = await getForecast(area, thresholds, (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('past_hours'), '172');
    assert.equal(url.searchParams.get('timeformat'), 'unixtime');
    return Promise.resolve(Response.json(forecastFixture));
  });
  assert.equal(forecast.hourly.cloud_cover?.length, forecast.hourly.time.length);
  const plan = planForecast(forecast, area, thresholds, Date.parse('2026-11-22T00:00:00Z'));
  assert.deepEqual(plan.events.map((event) => event.kind), ['rain-start', 'rain-stop']);
  assert.equal(plan.nextFetch, '2026-11-22T00:30:00.000Z');
});

const message: PushMessage = {
  to: 'ExponentPushToken[localFixture]', title: 'Preview test', body: 'Test notification',
  channelId: 'weather', priority: 'high', sound: 'default', data: { link: '/item/rain' },
};

Deno.test('Expo tickets preserve batch order and identify the rejected token', async () => {
  const messages = [message, { ...message, channelId: 'corrections-silent' as const, sound: null }];
  const outcomes = await sendExpoPushes(messages, 'local-fixture', async (input, init) => {
    const request = new Request(input, init as RequestInit);
    assert.equal(request.url, 'https://exp.host/--/api/v2/push/send');
    assert.equal(request.headers.get('Authorization'), 'Bearer local-fixture');
    assert.deepEqual(await request.json(), messages);
    return Promise.resolve(Response.json(ticketsFixture));
  });
  assert.deepEqual(outcomes, [{ receipt_id: ticketsFixture.data[0].id }, { code: 'DeviceNotRegistered' }]);
});

Deno.test('Expo throttling can retry and a lost response stays unconfirmed', async () => {
  const rateLimit = await sendExpoPushes([message], 'local-fixture', () =>
    Promise.resolve(new Response(null, { status: 429, headers: { 'Retry-After': '120' } })));
  const lost = await sendExpoPushes([message], 'local-fixture', () => Promise.reject(new Error('Timed out')));
  assert.deepEqual(rateLimit, [{ code: 'ExpoBusy', retry_seconds: 120 }]);
  assert.deepEqual(lost, [{ code: 'DeliveryUnknown' }]);
});

Deno.test('local anonymous install sees its simulated rain card and one queued push', async () => {
  assert.deepEqual(await simulateLocalRain(), { card: true, reusedEvent: true, queued: 1 });
});
