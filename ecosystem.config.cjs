require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'mdrpedia',
      script: './dist/server/entry.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      kill_timeout: 8000,
      listen_timeout: 10000,
      max_restarts: 10,
      restart_delay: 4000,
      shutdown_with_message: true,
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '4321',
        ...require('dotenv').config().parsed,
      },
    },
  ],
};
