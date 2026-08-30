import { Hono } from 'hono';
import { createId } from '@paralleldrive/cuid2';
import { cors } from 'hono/cors';
import { serve } from 'bun';
import { Server } from 'socket.io';
import type { TypedServer } from 'types/SocketEvents';
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
import { handleRouteError } from './backend/utils/request';
import { sendResponse } from './backend/utils/response';
import {
  closeSharedConnections,
  drainBackend,
  isHealthPath,
  isShuttingDown,
  registerProcessShutdown,
  trackInFlight,
} from './backend/utils/shutdown';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type GlobalObject from 'types/GlobalObject';

const BACKEND_PORT = process.env.PORT ? +process.env.PORT : 6060;
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = config.server.domains?.filter(Boolean) ?? [];

if (isProduction && corsOrigins.length === 0) {
  throw new Error('DOMAINS must be configured in production (comma-separated allowed origins).');
}

const app = new Hono<{ Variables: { requestID: string } }>();

const [
  [ db, client ],
  [ redisClient ],
] = await Promise.all([
  startDatabase(),
  startRedis(),
]);

const redisPubClient = redisClient.duplicate();
const redisSubClient = redisClient.duplicate();

const io: TypedServer = new Server({
  pingTimeout: 5000,
  transports: [ 'websocket' ],
  adapter: createAdapter(redisPubClient, redisSubClient),
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  },
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
} satisfies GlobalObject;

startSocketServer();

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : [],
  credentials: true,
}));

app.use(async (c, next) => {
  if (isShuttingDown() && !isHealthPath(c.req.path)) {
    return sendResponse({ c, status: 503, success: false, code: 'shuttingDown' });
  }

  await next();
});

// Allows us to pass in our DB instance to all our middleware
app.use(async (c, next) => {
  c.set('requestID', createId());

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
  if (err instanceof RouteResponseError) {
    return handleRouteError(err, c);
  }

  if (err.message && (err.message === 'Unexpected end of JSON input' || err.message === 'Failed to parse JSON')) {
    return c.json({ status: 400, success: false, message: 'Invalid request body, JSON is malformed' });
  }

  console.error(err);

  return c.json({ status: 500, success: false, message: 'Internal server error' });
});

const { websocket } = engine.handler();

const server = serve({
  port: BACKEND_PORT,
  idleTimeout: 30, // Must be greater than Engine pingInterval (defaults to 25s)
  fetch(req, bunServer) {
    const url = new URL(req.url);

    if (url.pathname === '/socket.io/') {
      return trackInFlight(engine.handleRequest(req, bunServer));
    }

    return trackInFlight(app.fetch(req, bunServer));
  },
  websocket,
});

registerProcessShutdown(async () => {
  await drainBackend({ server, engine });
  await closeSharedConnections({
    mongoClient: client,
    redisClient,
    redisPubClient,
    redisSubClient,
  });
});

console.log('Backend is running on port', BACKEND_PORT);
