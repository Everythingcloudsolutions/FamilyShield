/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/lib/**',           // redis/supabase clients — infrastructure, not unit-testable
    '!src/worker/**',        // event-consumer — requires live Redis, not unit-testable
    '!src/enrichers/index.ts', // barrel re-export
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
    },
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
        },
      },
    ],
  },
  setupFiles: ['<rootDir>/__tests__/setupEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
};

module.exports = config;
