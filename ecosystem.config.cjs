'use strict';
/* global module, __dirname */

module.exports = {
  apps: [
    {
      name: 'toldos-testar',
      cwd: __dirname,
      script: 'src/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 15000,
      restart_delay: 3000,
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        ENABLE_HERA: 'false',
        ENABLE_LEGACY_EXPORTS: 'false'
      }
    }
  ]
};
