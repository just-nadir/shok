module.exports = {
  apps: [
    {
      name: 'shok-taxi-api',
      script: './backend/dist/index.js',
      cwd: '/home/deploy/shoktaxi',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
