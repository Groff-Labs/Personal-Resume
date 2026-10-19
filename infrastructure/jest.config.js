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
    '^.+\\.tsx?$': 'ts-jest',
    // `corpus.ts` imports resume.md and knowledge/*.md as strings, which
    // esbuild does with its text loader. jest needs an equivalent or the
    // retrieval tests cannot import the corpus at all.
    '^.+\\.md$': '<rootDir>/test/markdown-transform.js'
  },
  // ts-jest ignores node_modules by default, which is right, but the .md
  // transform must still apply to files outside rootDir (resume.md and
  // knowledge/ are above infrastructure/).
  transformIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
