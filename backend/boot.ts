// React 19's development JSX runtime calls dispatcher.getOwner(), which
// react-dom/server production does not implement. Email templates then fail
// with "dispatcher.getOwner is not a function". bun --env-file can overwrite
// the image NODE_ENV, so pin production before any React import.
process.env.NODE_ENV = 'production';

await import('../app.ts');
