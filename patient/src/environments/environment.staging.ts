export const environment = {
 production: false,
 environment: 'staging',

 apiUrl: 'https://your-staging-api.com/api/v1',
 baseUrl: 'https://your-staging-api.com',

 wsUrl: 'https://your-staging-api.com',
 socketUrl: 'https://your-staging-api.com',

 healthCheckUrl: 'https://your-staging-api.com/health',
 healthCheckInterval: 45000, // 45 seconds for staging

 connectionTimeout: 12000, // 12 seconds
 maxRetryAttempts: 4,
 retryDelay: 3000, // 3 seconds

 enableDevTools: true,
 enableDebugLogging: true,
 enableMockData: false,

 corsEnabled: true,

 mediaConfig: {
  videoEnabled: true,
  audioEnabled: true,
  screenShareEnabled: true,
  maxBitrate: 1500000, // 1.5 Mbps for staging
 },

 chatConfig: {
  maxMessageLength: 1000,
  messageTimeout: 35000, // 35 seconds
  reconnectAttempts: 4,
 },

 appConfig: {
  name: 'HCW-Home Patient (Staging)',
  version: '1.0.0',
  buildTime: new Date().toISOString(),
 }
};
