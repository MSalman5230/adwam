import { simulateLocalRain } from '../supabase/function-tests/local-install.ts';

if (Deno.args[0] === 'simulate-rain') {
  const result = await simulateLocalRain();
  if (!result.card || !result.reusedEvent || result.queued !== 1) throw new Error('The rain simulation did not complete');
  console.log(JSON.stringify(result));
} else {
  const serve = Deno.serve;
  let server: Deno.HttpServer<Deno.NetAddr> | undefined;
  Object.defineProperty(Deno, 'serve', { value: (handler: Deno.ServeHandler) => {
    server = serve({ hostname: '127.0.0.1', port: 0, onListen: () => {} }, handler);
    return server;
  } });
  try {
    await import('../supabase/functions/weather-tick/index.ts');
  } finally {
    Object.defineProperty(Deno, 'serve', { value: serve });
  }
  if (!server) throw new Error('The local weather worker did not start');
  try {
    const response = await fetch(`http://127.0.0.1:${server.addr.port}`, {
      method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('ADWAM_JOB_KEY')}` },
    });
    if (!response.ok) throw new Error('The local weather tick failed');
    console.log(JSON.stringify(await response.json()));
  } finally {
    await server.shutdown();
  }
}
