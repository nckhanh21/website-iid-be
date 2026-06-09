/**
 * PM2 ecosystem file for the IID backend (Express + SQLite).
 *
 * Named `.cjs` on purpose: the backend's package.json sets `"type": "module"`,
 * so a plain `.js` config would be parsed as ESM and PM2 would fail to load it.
 *
 * Usage on the server:
 *   pm2 start ecosystem.config.cjs                # start in production
 *   pm2 reload ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup                       # persist across reboots
 *   pm2 logs website-iid-be                       # tail logs
 *
 * Real secrets (JWT_SECRET, ADMIN_PASSWORD, etc.) belong in the .env file on
 * the server, which src/index.js loads via dotenv. Only non-sensitive runtime
 * defaults are set here.
 */
module.exports = {
  apps: [
    {
      name: 'website-iid-be',
      script: 'src/index.js',
      // Resolve paths relative to this file so PM2 works from any CWD.
      cwd: __dirname,
      // Single fork instance — better-sqlite3 is synchronous and file-backed,
      // so cluster mode / multiple instances would contend on the same DB.
      exec_mode: 'fork',
      instances: 1,
      // Restart policy.
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      // Logging.
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      // Default environment (overridden by .env values loaded in index.js).
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
    },
  ],
}
