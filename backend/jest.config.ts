import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts", "**/*.spec.ts"],
  moduleNameMapper: {
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@adapters/(.*)$": "<rootDir>/src/adapters/$1",
    "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/infrastructure/db/migrate.ts",
    "!src/infrastructure/db/seed.ts",
  ],
};

export default config;
