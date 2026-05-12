import { Router } from 'express';
import { z } from 'zod';
import { RedditAutonomousOrchestrator } from '../orchestrator';
import { RedditEvent } from '../types';

const ingestSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['post', 'comment']),
  subreddit: z.string().min(1),
  author: z.string().min(1),
  title: z.string().optional(),
  body: z.string().min(1),
  createdAt: z.string().datetime(),
  score: z.number(),
  numComments: z.number().optional(),
  permalink: z.string().optional(),
  keywords: z.array(z.string()).optional()
});

const outcomeSchema = z.object({
  actionId: z.string().min(1),
  karmaDelta: z.number(),
  removedByMods: z.boolean(),
  deleted: z.boolean(),
  replyCount: z.number().int().nonnegative()
});

export const createApiRouter = (orchestrator: RedditAutonomousOrchestrator): Router => {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'reddit-24-7', timestamp: new Date().toISOString() });
  });

  router.post('/events/ingest', async (req, res) => {
    const parsed = ingestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const { event, action } = await orchestrator.ingestAndEvaluate(parsed.data as RedditEvent);
      res.status(201).json({ event, action });
    } catch (error) {
      res.status(502).json({ error: 'Failed to process event', details: (error as Error).message });
    }
  });

  router.get('/events', (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    res.json({ events: orchestrator.listEvents(limit) });
  });

  router.get('/actions', (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    res.json({ actions: orchestrator.listActions(limit) });
  });

  router.post('/actions/outcome', (req, res) => {
    const parsed = outcomeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { actionId, karmaDelta, removedByMods, deleted, replyCount } = parsed.data;
    const action = orchestrator.recordOutcome(actionId, karmaDelta, removedByMods, deleted, replyCount);

    if (!action) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    res.status(200).json({ actionId, recorded: true });
  });

  router.get('/analytics/dashboard', (_req, res) => {
    res.json({ dashboard: orchestrator.dashboard() });
  });

  return router;
};
