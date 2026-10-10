let appInstance = null;

export default async function handler(req, res) {
  try {
    if (!appInstance) {
      const { createApp } = await import('../backend/src/app.js');
      appInstance = createApp();
    }
    return appInstance(req, res);
  } catch (err) {
    console.error('[VERCEL_SERVERLESS_ERROR]', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Serverless initialization failed',
      stack: process.env.NODE_ENV === 'production' ? err.stack : undefined,
    });
  }
}
