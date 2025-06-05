export default () => ({
  port: parseInt(process.env.PORT!, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  swagger: {
    enabled: process.env.NODE_ENV === 'development',
    title: 'HCW-Home Backend API',
    description:
      'Comprehensive API documentation for HCW-Home Backend services',
    version: '1.0.0',
    path: 'api/docs',
  },
});
