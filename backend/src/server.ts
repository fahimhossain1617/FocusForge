import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import aiRoutes from './routes/aiRoutes';
import mindRoutes from './routes/mindRoutes';
import diaryRoutes from './routes/diaryRoutes';
import focusRoutes from './routes/focusRoutes';
import learningRoutes from './routes/learningRoutes';
import taskRoutes from './routes/taskRoutes';
import noteRoutes from './routes/noteRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reviewRoutes from './routes/reviewRoutes';
import supervisorRoutes from './routes/supervisorRoutes';
import syncRoutes from './routes/syncRoutes';
import { createServer } from 'http';
import { setupWebSocketServer } from './services/webSocketService';
import { startNotificationScheduler } from './services/notificationSchedulerService';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Trust first reverse proxy (e.g. Vercel, Cloudflare, Nginx)
app.set('trust proxy', 1);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://focus-forge-fahimhossain1617-7909s-projects.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
].filter(Boolean) as string[];

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin / internal requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/sync', syncRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/mind', mindRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/supervisor', supervisorRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const host = process.env.HOST || '0.0.0.0';
const server = createServer(app);
setupWebSocketServer(server);

// Start background notification scheduler worker
startNotificationScheduler(60000);

server.listen(Number(port), host, () => {
  console.log(`Focentia Backend running on http://${host}:${port}`);
});
