module.exports = {
  testEnvironment: 'node',
  // Prefer .ts over .js. `tsconfig.json` has no outDir, so `npm run build`
  // used to emit compiled .js next to the sources, and jest resolved those
  // instead -- silently testing a months-old build. `cdk synth` never hit this
  // because cdk.json runs `ts-node --prefer-ts-exts`.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
