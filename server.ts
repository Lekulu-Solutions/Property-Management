import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createServer as createViteServer } from 'vite';

const execFileAsync = promisify(execFile);

const ROOT_DIR = process.cwd();
const CLOUD_SESSION_PATH = path.join(ROOT_DIR, '.apk-cloud-session.json');
const PUBLIC_APK_PATH = path.join(ROOT_DIR, 'public', 'Mesfin_Zewdnesh_Ledger.apk');
const DIST_APK_PATH = path.join(ROOT_DIR, 'dist', 'Mesfin_Zewdnesh_Ledger.apk');
const BUILD_SCRIPT_PATH = path.join(ROOT_DIR, 'scripts', 'build_apk.py');

let isRepackingApk = false;
let pendingRepackPromise: Promise<void> | null = null;

async function triggerFastApkRepack(): Promise<void> {
  if (isRepackingApk && pendingRepackPromise) {
    return pendingRepackPromise;
  }
  isRepackingApk = true;
  pendingRepackPromise = (async () => {
    try {
      await execFileAsync('python3', [BUILD_SCRIPT_PATH, '--fast-repack'], {
        cwd: ROOT_DIR,
      });
      if (fs.existsSync(path.join(ROOT_DIR, 'dist')) && fs.existsSync(PUBLIC_APK_PATH)) {
        fs.copyFileSync(PUBLIC_APK_PATH, DIST_APK_PATH);
      }
    } catch (err) {
      console.error('APK fast-repack warning:', err);
    } finally {
      isRepackingApk = false;
      pendingRepackPromise = null;
    }
  })();
  return pendingRepackPromise;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Background session sync from Desktop browser so static APK is always pre-authenticated
  app.post('/api/apk-session-sync', async (req, res) => {
    try {
      const payload = req.body;
      if (payload && typeof payload === 'object' && payload.authUser && payload.authUser.uid) {
        fs.writeFileSync(CLOUD_SESSION_PATH, JSON.stringify(payload), 'utf-8');
        triggerFastApkRepack().catch(() => {});
      }
      res.status(200).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  });

  // 2. On-demand personalized pre-authenticated APK build & download
  app.post('/api/build-synced-apk', async (req, res) => {
    try {
      const payload = req.body;
      if (payload && typeof payload === 'object' && payload.authUser && payload.authUser.uid) {
        fs.writeFileSync(CLOUD_SESSION_PATH, JSON.stringify(payload), 'utf-8');
        await triggerFastApkRepack();
      }
      if (!fs.existsSync(PUBLIC_APK_PATH)) {
        await triggerFastApkRepack();
      }
      const apkBuffer = fs.readFileSync(PUBLIC_APK_PATH);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="Mesfin_Zewdnesh_Ledger.apk"');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(apkBuffer);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
