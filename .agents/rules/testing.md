# Testing

Moved to [`docs/testing.md`](../../docs/testing.md) — the single source.

Short version: runner is **rstest**; co-locate `Foo.test.ts` next to `Foo.ts`,
put shared fixtures in a package `test/` dir; every test name starts with
**“Should”**; `shared`/`server` get robust behavior tests, `client` gets
user-behavior tests that aren't flaky. See the doc for the full guidance.
