// Test-only stub for the `server-only` marker package. In the Vitest (Node)
// environment there is no client bundle, so importing `server-only` would throw.
// Aliased in vitest.config.ts. This is NOT used in the app build.
export {};
