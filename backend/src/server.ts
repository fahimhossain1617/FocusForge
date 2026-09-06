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

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/mind', mindRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/user', userRoutes);

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
app.listen(Number(port), host, () => {
  console.log(`FocusForge Backend running on http://${host}:${port}`);
});
