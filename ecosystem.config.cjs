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
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '4321',
        ...require('dotenv').config().parsed,
      },
    },
  ],
};
