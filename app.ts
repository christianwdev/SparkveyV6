import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from 'bun';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as Engine } from '@socket.io/bun-engine';

// Databases
import startDatabase from './backend/database/database';

// Config
import config from './backend/config/config';
import initializeRoutes from './backend/routes';
import startRedis from './backend/database/redis';
import startSocketServer from './backend/socket';
import { createDistributedLock } from './backend/utils/distributedLock';

const BACKEND_PORT = process.env.PORT ? +process.env.PORT : 6060;

const app = new Hono();

const [
  [ db, client ],
  [ redisClient ],
] = await Promise.all([
  startDatabase(),
  startRedis(),
]);

const redisPubClient = redisClient.duplicate();
const redisSubClient = redisClient.duplicate();

const io = new Server({
  pingTimeout: 5000,
  adapter: createAdapter(redisPubClient, redisSubClient),
});

const engine = new Engine({
  path: '/socket.io/',
});

io.bind(engine);

global.globalObject = {
  db,
  mongoClient: client,
  redisClient,
  redisPubClient,
  redisSubClient,
  io,
  distributedLock: createDistributedLock(redisClient),
};

startSocketServer();

app.use(cors({
  origin: config.server.domains || '*',
  credentials: true,
}));

// Allows us to pass in our DB instance to all our middleware
app.use(async (context, next) => {
  await next();
});

app.route('/', initializeRoutes());

app.get('/', c => c.json({
  name: 'Base',
  version: 'v0.0.1',
}));

app.notFound(c => {
  return c.json({ status: 404, success: false, message: 'Not found' });
});

app.onError(async (err, c) => {
  if (err.message && (err.message === 'Unexpected end of JSON input' || err.message === 'Failed to parse JSON')) {
    return c.json({ status: 400, success: false, message: 'Invalid request body, JSON is malformed' });
  }

  return c.json({ status: 500, success: false, message: 'Internal server error' });
});

const { websocket } = engine.handler();

serve({
  port: BACKEND_PORT,
  idleTimeout: 30, // Must be greater than Engine pingInterval (defaults to 25s)
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/socket.io/') {
      return engine.handleRequest(req, server);
    }

    return app.fetch(req, server);
  },
  websocket,
});

console.log('Backend is running on port', BACKEND_PORT);
