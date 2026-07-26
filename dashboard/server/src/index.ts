import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import sitesRouter from './routes/sites';
import runsRouter from './routes/runs';
import schedulesRouter from './routes/schedules';
import liveRouter from './routes/live';
import testsRouter from './routes/tests';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/sites', sitesRouter);
app.use('/api/runs', runsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/live', liveRouter);
app.use('/api/tests', testsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve test artifacts (videos, screenshots)
const ARTIFACTS_DIR = path.resolve(__dirname, '..', '..', '..', 'reports', 'artifacts');
app.get('/api/artifacts/:folder/:file', (req, res) => {
  const filePath = path.join(ARTIFACTS_DIR, req.params.folder, req.params.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(filePath).pipe(res);
});

app.listen(PORT, () => {
  console.log(`  Dashboard API running at http://localhost:${PORT}`);
});

export default app;
