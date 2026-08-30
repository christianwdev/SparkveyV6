// Same NODE_ENV pin as backend/boot.ts — keep worker React/email SSR consistent.
process.env.NODE_ENV = 'production';

await import('./index.ts');
