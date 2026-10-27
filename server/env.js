import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Load ../.env before any other module reads process.env.
const file = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(file)) process.loadEnvFile(file);
