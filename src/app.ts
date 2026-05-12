import cors from 'cors';
import express from 'express';
import { InMemoryStore } from './store/inMemoryStore';
import { RedditAutonomousOrchestrator } from './orchestrator';
import { createApiRouter } from './routes/api';

export const createApp = () => {
  const app = express();
  const store = new InMemoryStore();
  const orchestrator = new RedditAutonomousOrchestrator(store);

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createApiRouter(orchestrator));

  return {
    app,
    orchestrator
  };
};
