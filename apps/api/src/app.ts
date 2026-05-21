import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import KnexSessionStore from 'connect-session-knex';
import knex, { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './lib/env.js';
import { cookieParser, csrfProtection } from './middlewares/csrf.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiRateLimiter } from './middlewares/rateLimit.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import printerRoutes from './routes/printer.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();

// Trust proxy - Important si derrière nginx/cloudflare
app.set('trust proxy', 1); // Trust first proxy

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3001", "https://lineacnc.celest1ce.com"], // Allow API connections
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session store configuration with Knex (persistent sessions in MariaDB)
const knexClient: Knex = knex({
  client: 'mysql2',
  connection: env.DATABASE_URL
});

const store = new (KnexSessionStore(session))({
  knex: knexClient as any,
  tablename: 'sessions',
  createtable: true,
  clearInterval: 1000 * 60 * 30 // Clear expired sessions every 30 minutes
});

// Session middleware
app.use(session({
  secret: env.SESSION_SECRET,
  store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  },
  name: 'connect.sid'
}));

// Rate limiting
app.use('/api', apiRateLimiter);

// Health check endpoint (no CSRF)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// CSRF token endpoint (no CSRF protection on this route)
app.get('/api/csrf-token', (req: any, res: any, next: any) => {
  csrfProtection(req, res, (err: any) => {
    if (err) return next(err);
    res.json({ csrfToken: req.csrfToken() });
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', printerRoutes);

// Serve uploaded files
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Serve static files from React build
const frontendPath = path.join(__dirname, '../../web/dist');
app.use(express.static(frontendPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
