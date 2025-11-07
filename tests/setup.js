process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

jest.mock('../src/utils/logging', () => ({
  logInfo: jest.fn().mockResolvedValue(undefined),
  logWarning: jest.fn().mockResolvedValue(undefined),
  logError: jest.fn().mockResolvedValue(undefined),
  logAuth: jest.fn().mockResolvedValue(undefined),
  logSecurity: jest.fn().mockResolvedValue(undefined),
  logSystem: jest.fn().mockResolvedValue(undefined),
  logUserAction: jest.fn().mockResolvedValue(undefined),
  createSessionLog: jest.fn().mockResolvedValue(undefined),
  closeSessionLog: jest.fn().mockResolvedValue(undefined),
  getLogs: jest.fn().mockResolvedValue([])
}));

jest.mock('../src/config/database', () => {
  const actual = jest.requireActual('../src/config/database');
  return {
    ...actual,
    executeQuery: jest.fn()
  };
});

afterEach(() => {
  jest.clearAllMocks();
});
