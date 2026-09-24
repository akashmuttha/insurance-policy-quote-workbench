import { createServer } from 'vite';
import { createApiServer } from '../server/app.mjs';

const api = createApiServer();
let web;
try {
  await new Promise((resolve, reject) => {
    api.once('error', reject);
    api.listen(3001, '127.0.0.1', resolve);
  });
  web = await createServer();
  await web.listen();
  console.log('Demo API: http://127.0.0.1:3001');
  web.printUrls();
} catch (error) {
  console.error(error.message);
  await web?.close();
  api.close();
  process.exitCode = 1;
}

async function shutdown() {
  await web?.close();
  api.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
