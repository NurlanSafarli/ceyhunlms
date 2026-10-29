// Drop-in replacement for server/app.mjs createApp(): runs the PHP API under `php -S`
// so the existing HTTP tests verify the PHP backend used on shared hosting.
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const router = resolve(import.meta.dirname, '../php/router.php');
const freePort = () =>
  new Promise((ok) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

export function createApp({
  dbPath,
  rateLimit = 10,
  rateWindowMs = 600_000,
  adminCredentials = null,
  trustProxy = false,
  production = false,
} = {}) {
  if (!dbPath || dbPath === ':memory:')
    dbPath = join(mkdtempSync(join(tmpdir(), 'jayhun-php-')), 'mem.sqlite');
  const env = {
    ...process.env,
    DATABASE_PATH: dbPath,
    RATE_LIMIT: String(rateLimit),
    RATE_WINDOW_MS: String(rateWindowMs),
    TRUST_PROXY_HOPS: String(trustProxy || 0),
    APP_PRODUCTION: String(production),
    ADMIN_USERNAME: adminCredentials?.username ?? '',
    ADMIN_PASSWORD: adminCredentials?.password ?? '',
  };
  // Initialise schema/admin synchronously, like the Node constructor.
  spawnSync('php', ['-r', `$_SERVER['REQUEST_URI']='/api/__init';$_SERVER['REQUEST_METHOD']='GET';ob_start();require '${router.replace('router.php', 'bootstrap.php')}';ob_end_clean();`], { env });
  const procs = [];
  return {
    app: {
      listen(_port, host = '127.0.0.1') {
        const server = new EventEmitter();
        let port;
        freePort().then((p) => {
          port = p;
          const proc = spawn('php', ['-S', `${host}:${p}`, router], {
            env: { ...env, PHP_CLI_SERVER_WORKERS: '4' },
            stdio: 'ignore',
          });
          procs.push(proc);
          server.proc = proc;
          const poll = async () => {
            try {
              await fetch(`http://${host}:${p}/api/health`);
              server.emit('listening');
            } catch {
              setTimeout(poll, 50);
            }
          };
          poll();
        });
        server.address = () => ({ port, address: host });
        server.close = (cb) => {
          server.proc?.kill();
          server.proc?.once('exit', () => cb?.());
          if (!server.proc) cb?.();
        };
        return server;
      },
    },
    close() {
      for (const p of procs) p.kill();
    },
  };
}
