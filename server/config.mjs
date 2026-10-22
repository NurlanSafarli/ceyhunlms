import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseEnv } from 'node:util';
import { projectRoot } from './database.mjs';

export function readEnvironment({ root = projectRoot, env = process.env } = {}) {
  const file = join(root, '.env');
  return { ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}), ...env };
}

export function databasePath(env = readEnvironment(), root = projectRoot) {
  const path = env.DATABASE_PATH || '.local/registrations.sqlite';
  return path === ':memory:' ? path : resolve(root, path);
}

export function runtimeConfig({ env = readEnvironment(), local = false } = {}) {
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT 1–65535 aralığında tam ədəd olmalıdır.');
  const production = local || env.NODE_ENV === 'production';
  const host = local ? '127.0.0.1' : env.HOST || '0.0.0.0';
  if (!['true', 'false', '', undefined].includes(env.COOKIE_SECURE))
    throw new Error('COOKIE_SECURE yalnız true və ya false ola bilər.');
  const secureCookies = local
    ? false
    : env.COOKIE_SECURE
      ? env.COOKIE_SECURE === 'true'
      : production;
  if (production && !secureCookies && !['127.0.0.1', '::1', 'localhost'].includes(host))
    throw new Error(
      'HTTP giriş yalnız lokal ünvanda mümkündür. Serverdə COOKIE_SECURE=true istifadə edin.',
    );
  const hops = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5)
    throw new Error('TRUST_PROXY_HOPS 0–5 aralığında tam ədəd olmalıdır.');
  return {
    host,
    port,
    dbPath: databasePath(env),
    production,
    secureCookies,
    trustProxy: local ? false : hops || false,
    adminCredentials: env.ADMIN_PASSWORD
      ? { username: env.ADMIN_USERNAME || 'admin', password: env.ADMIN_PASSWORD }
      : null,
  };
}
