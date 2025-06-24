require('dotenv').config({ path: './.env' });

module.exports = {
  apps: [{
    name: 'email-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: 3001,
    },
    env_production: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: 3001,
    }
  }]
}; 