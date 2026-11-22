import { createSharedServer } from './server/shared-server.mjs';
import { resolve } from 'node:path';
const port = Number(process.env.PORT || 3000);
const app = createSharedServer({ dbPath: resolve(process.env.HELIO_DB_PATH || '.local/helio.sqlite'), password: process.env.HELIO_TEAM_PASSWORD, encryptionKey: process.env.HELIO_DATA_KEY, origin: process.env.HELIO_PUBLIC_ORIGIN });
app.server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Helio Home listening on port ${port}. Shared tracking ${app.enabled ? 'configured' : 'not configured; local tools available'}.`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => app.close().then(() => process.exit(0)));
