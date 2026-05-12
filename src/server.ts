import { createApp } from './app';
import { config } from './config';

const { app, orchestrator } = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`reddit-24-7 backend listening on port ${config.port}`);
});

const shutdown = async () => {
  await orchestrator.close();
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
