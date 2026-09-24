import { createApiServer } from './app.mjs';

const server = createApiServer();
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(3001, '127.0.0.1', () => console.log('Demo API: http://127.0.0.1:3001'));
