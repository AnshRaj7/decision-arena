import type { IncomingMessage, ServerResponse } from 'http';

function getServerGeminiApiKey(): string {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (
    !cleaned ||
    cleaned === 'MY_GEMINI_API_KEY' ||
    cleaned === 'YOUR_GEMINI_API_KEY'
  ) {
    return '';
  }
  return cleaned;
}

function sendJson(
  res: ServerResponse & { status?: (code: number) => any; json?: (body: any) => any },
  statusCode: number,
  payload: Record<string, unknown>
) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: IncomingMessage & { method?: string },
  res: ServerResponse
) {
  try {
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, {
        configured: false,
        error: `Method ${req.method} Not Allowed. Use GET /api/live/status.`,
      });
      return;
    }

    const configured = Boolean(getServerGeminiApiKey());

    sendJson(res, 200, {
      configured,
      model: 'gemini-3.8-live',
      message: configured
        ? 'Gemini Live API credentials are configured on the server.'
        : 'GEMINI_API_KEY is missing in server environment variables.',
    });
  } catch (err: any) {
    sendJson(res, 500, {
      configured: false,
      model: 'gemini-3.8-live',
      error: err?.message || 'Unexpected error checking Gemini Live API status.',
    });
  }
}
