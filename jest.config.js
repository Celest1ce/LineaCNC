module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.js', '!src/views/**'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
