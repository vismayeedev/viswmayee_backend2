import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import { setupSwagger } from './utils/swagger';

const app = express();

// Set up Swagger docs
setupSwagger(app);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Healthy route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'ViswaSchool backend is healthy' });
});

// Register all modular routes under /api
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
