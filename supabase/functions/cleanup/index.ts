import { serveJob, serviceClient } from '../_lib/job-runtime.ts';

serveJob('cleanup', async () => {
  const { data, error } = await serviceClient().rpc('server_cleanup_v1');
  if (error) throw new Error('Cleanup failed');
  return data;
});
