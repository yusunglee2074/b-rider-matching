module.exports = {
  apps: [
    {
      name: 'api-gateway-dev',
      script: 'node_modules/.bin/nest',
      args: 'start api-gateway --watch',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    {
      name: 'core-service-dev',
      script: 'node_modules/.bin/nest',
      args: 'start core-service --watch',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
    {
      name: 'location-service-dev',
      script: 'node_modules/.bin/nest',
      args: 'start location-service --watch',
      watch: false,
      env: {
        NODE_ENV: 'development',
        HTTP_PORT: 3003,
        GRPC_PORT: 5003,
      },
    },
    {
      name: 'notification-worker-dev',
      script: 'node_modules/.bin/nest',
      args: 'start notification-worker --watch',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
