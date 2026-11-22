import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const text = `# Local development only. Never commit this file.\nHELIO_PUBLIC_ORIGIN=http://127.0.0.1:3000\nHELIO_TEAM_PASSWORD=${randomBytes(24).toString('base64url')}\nHELIO_DATA_KEY=${randomBytes(32).toString('base64')}\n`;
await writeFile(new URL('../.env', import.meta.url), text, { flag: 'wx', mode: 0o600 });
console.log('Created .env with a random team password and encryption key. Read it privately for the password. Keep the key with your database backups. Existing files are never overwritten.');
