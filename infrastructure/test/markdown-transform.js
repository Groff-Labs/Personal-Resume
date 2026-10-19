/**
 * Lets jest import `*.md` as a string, the way esbuild does at build time.
 *
 * `corpus.ts` and `knowledge.ts` import `resume.md` and `knowledge/*.md`
 * directly; the Lambda bundle handles that with esbuild's
 * `loader: { '.md': 'text' }`. jest has no such loader, so before this the
 * retrieval assertions could not be a test at all and lived as an esbuild
 * script invoked from `scripts/check.sh` — which meant they were a shell step
 * rather than part of the suite, and did not show up in the test count.
 *
 * Deliberately not a snapshot or a fixture: the point of having no codegen step
 * is that the tests read the same bytes the Lambda does.
 */
module.exports = {
  process(sourceText) {
    return { code: `module.exports = ${JSON.stringify(sourceText)};\n` };
  },
  // Content is the whole input, so the default cache key (which hashes the
  // file) is correct; nothing to add.
};
