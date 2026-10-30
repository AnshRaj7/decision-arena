import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// Short-lived ephemeral token store (token -> { expiresAt, voiceName })
const ephemeralTokens = new Map<string, { expiresAt: number; voiceName: string }>();

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [tok, meta] of ephemeralTokens.entries()) {
    if (meta.expiresAt <= now) {
      ephemeralTokens.delete(tok);
    }
  }
}

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VOICE_ASSISTANT_SYSTEM_INSTRUCTION = `You are the Decision Arena AI Voice Assistant, an intelligent, warm, and structured decision-making coach built into the "Decision Arena" web application.

LANGUAGE CAPABILITIES:
- You fluently understand and speak English, Hindi (हिन्दी), and Hinglish (conversational blend of Hindi and English).
- Automatically match the language or Hinglish style the user speaks in. If the user speaks in Hindi or Hinglish, reply naturally in Hindi or Hinglish. If they speak in English, reply in English.

YOUR ROLE & WORKFLOW:
Your goal is to help the user build a structured comparison between 2 or 3 options using weighted criteria (1–10) and ratings (1–10).
Follow this natural conversational flow:
1. Understand the user's decision goal (e.g., choosing between laptops, universities, job offers, cloud providers, phones, or cities).
2. Ask 1 or 2 concise, relevant follow-up questions if needed to clarify their priorities or budget/constraints.
3. Suggest 2 or 3 clear options (or use the exact 2–3 options the user wants to compare).
4. Suggest 3 to 5 suitable evaluation criteria and assign each criterion an importance weight from 1 to 10 based on the user's priorities.
5. Suggest or collect ratings from 1 to 10 for every option against every criterion.
6. Whenever you have a complete set of 2–3 options, criteria with weights (1–10), and ratings (1–10), immediately call the "proposeComparisonDraft" tool so the user can see the visual Comparison Draft card on their screen. You can call "proposeComparisonDraft" again anytime the user asks to tweak an option, criterion, weight, or rating.
7. IMPORTANT: Never finalize or populate the main comparison form without asking the user first. After calling "proposeComparisonDraft", briefly summarize the draft and ask the user for confirmation (e.g., "I've prepared the comparison draft on your screen. Would you like me to apply this to your New Comparison form?" / "मैंने ड्राफ्ट स्क्रीन पर तैयार कर दिया है, क्या मैं इसे आपके फॉर्म में जोड़ दूँ?").
8. Only call "confirmComparisonDraft" AFTER the user explicitly says yes / approves the draft.

Keep your spoken responses concise, natural, encouraging, and easy to listen to.`;

const proposeComparisonDraftTool = {
  name: 'proposeComparisonDraft',
  description:
    'Creates or updates a structured comparison draft (2 or 3 options, custom criteria with weights 1-10, and ratings 1-10 for every option-criterion pair) and displays it in the user interface for review before confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Clear title for the comparison, e.g., "Best Engineering Laptop" or "Cloud Platform Choice".',
      },
      category: {
        type: Type.STRING,
        description: 'Short category label, e.g., "Hardware", "Career", "Academic", "Tech".',
      },
      options: {
        type: Type.ARRAY,
        description: 'List of 2 or 3 options being compared.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Custom name of the option (e.g., "MacBook Air M3", "ThinkPad X1").',
            },
            description: {
              type: Type.STRING,
              description: 'Brief note or highlight about this option.',
            },
          },
          required: ['name'],
        },
      },
      criteria: {
        type: Type.ARRAY,
        description: 'List of evaluation criteria (typically 3 to 6 criteria) with weights from 1 to 10.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Name of the criterion (e.g., "Battery Life", "Pricing", "Performance").',
            },
            weight: {
              type: Type.NUMBER,
              description: 'Importance weight from 1 (lowest) to 10 (highest).',
            },
          },
          required: ['name', 'weight'],
        },
      },
      ratings: {
        type: Type.ARRAY,
        description: 'Ratings from 1 to 10 for each option on each criterion.',
        items: {
          type: Type.OBJECT,
          properties: {
            optionName: {
              type: Type.STRING,
              description: 'Exact name of the option being rated.',
            },
            criterionName: {
              type: Type.STRING,
              description: 'Exact name of the criterion being rated.',
            },
            rating: {
              type: Type.NUMBER,
              description: 'Score from 1 (lowest) to 10 (highest).',
            },
          },
          required: ['optionName', 'criterionName', 'rating'],
        },
      },
    },
    required: ['title', 'options', 'criteria', 'ratings'],
  },
};

const confirmComparisonDraftTool = {
  name: 'confirmComparisonDraft',
  description:
    'Confirms and populates the approved comparison draft into the user’s New Comparison form. Call this ONLY after the user explicitly approves or confirms the proposed comparison draft.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: {
        type: Type.BOOLEAN,
        description: 'Set to true when the user confirms they want to apply the draft.',
      },
    },
    required: ['confirmed'],
  },
};

async function startServer() {
  const app = express();
  app.use(express.json());

  const { default: liveStatusHandler } = await import('./api/live/status.ts');
  const { default: liveTokenHandler } = await import('./api/live/token.ts');

  // Health & configuration status endpoint (shared with Vercel serverless /api/live/status)
  app.all('/api/live/status', async (req, res) => {
    await liveStatusHandler(req, res);
  });

  // Short-lived Ephemeral Session Token endpoint (shared with Vercel serverless /api/live/token)
  app.all('/api/live/token', async (req, res) => {
    await liveTokenHandler(req, res);
  });

  // Ensure any unknown /api/* route always returns JSON, never HTML
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  const server = http.createServer(app);

  // WebSocket Server for Real-Time Gemini Live API Voice Streaming
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname === '/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
      // Ignore other upgrade requests (e.g. Vite HMR if any)
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket, request: http.IncomingMessage) => {
    cleanupExpiredTokens();

    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token') || '';
    const tokenMeta = ephemeralTokens.get(token);

    if (!token || !tokenMeta || tokenMeta.expiresAt <= Date.now()) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid or expired ephemeral session token. Please reconnect.',
        })
      );
      clientWs.close(1008, 'Invalid session token');
      return;
    }

    // Consume single-use token
    ephemeralTokens.delete(token);

    if (!isApiKeyConfigured()) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message:
            'GEMINI_API_KEY is missing on the server. Configure it in the Secrets panel to use Gemini Live API.',
        })
      );
      clientWs.close(1011, 'Missing API key');
      return;
    }

    let liveSession: any = null;
    let isClosed = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      const ai = getGenAIClient();

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: tokenMeta.voiceName || 'Zephyr',
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: VOICE_ASSISTANT_SYSTEM_INSTRUCTION,
          tools: [
            {
              functionDeclarations: [
                proposeComparisonDraftTool,
                confirmComparisonDraftTool,
              ],
            },
          ],
        },
        callbacks: {
          onopen: () => {
            safeSend({
              type: 'connected',
              model: 'gemini-3.8-live',
              voiceName: tokenMeta.voiceName,
            });
          },
          onmessage: (message: any) => {
            const content = message.serverContent;

            // User speech transcription
            if (content?.inputTranscription?.text) {
              safeSend({
                type: 'input_transcription',
                text: content.inputTranscription.text,
              });
            }

            // AI speech transcription
            if (content?.outputTranscription?.text) {
              safeSend({
                type: 'output_transcription',
                text: content.outputTranscription.text,
              });
            }

            // Model audio & text parts
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                safeSend({
                  type: 'audio',
                  audio: part.inlineData.data,
                });
              }
              if (part.text) {
                safeSend({
                  type: 'model_text',
                  text: part.text,
                });
              }
            }

            if (content?.interrupted) {
              safeSend({ type: 'interrupted' });
            }

            if (content?.turnComplete) {
              safeSend({ type: 'turn_complete' });
            }

            // Handle Function Tool Calls from Gemini Live
            const functionCalls = message.toolCall?.functionCalls ?? [];
            if (functionCalls.length > 0) {
              const functionResponses: any[] = [];

              for (const call of functionCalls) {
                if (call.name === 'proposeComparisonDraft') {
                  safeSend({
                    type: 'draft_proposed',
                    draft: call.args,
                  });
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: {
                      result:
                        'Comparison draft displayed on screen. Now ask the user if they confirm applying this draft to their New Comparison form.',
                    },
                  });
                } else if (call.name === 'confirmComparisonDraft') {
                  safeSend({
                    type: 'draft_confirmed',
                    confirmed: Boolean(call.args?.confirmed),
                  });
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: {
                      result:
                        'Comparison draft has been confirmed and populated into the New Comparison form.',
                    },
                  });
                } else {
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { result: 'Unknown tool' },
                  });
                }
              }

              sessionPromise
                .then((sess: any) => {
                  sess.sendToolResponse({ functionResponses });
                })
                .catch((err: unknown) => {
                  console.error('Error sending tool response:', err);
                });
            }
          },
          onerror: (err: any) => {
            const errMsg =
              err?.message ||
              'An error occurred during the Gemini Live API session.';
            safeSend({
              type: 'error',
              message: errMsg,
            });
          },
          onclose: () => {
            if (!isClosed) {
              safeSend({
                type: 'session_closed',
                message: 'Gemini Live session ended.',
              });
            }
          },
        },
      });

      liveSession = await sessionPromise;

      clientWs.on('message', (rawData) => {
        if (isClosed) return;
        try {
          const parsed = JSON.parse(rawData.toString());
          if (parsed.type === 'audio' && typeof parsed.audio === 'string') {
            sessionPromise
              .then((sess: any) => {
                sess.sendRealtimeInput({
                  audio: {
                    data: parsed.audio,
                    mimeType: 'audio/pcm;rate=16000',
                  },
                });
              })
              .catch(() => {});
          } else if (parsed.type === 'text' && typeof parsed.text === 'string') {
            sessionPromise
              .then((sess: any) => {
                sess.sendRealtimeInput({
                  text: parsed.text,
                });
              })
              .catch(() => {});
          }
        } catch {
          // ignore malformed messages
        }
      });

      clientWs.on('close', () => {
        isClosed = true;
        if (liveSession) {
          try {
            liveSession.close();
          } catch {
            // ignore close error
          }
        }
      });
    } catch (error: any) {
      const message =
        error?.message ||
        'Failed to establish connection with Gemini Live API. Verify your GEMINI_API_KEY in Settings > Secrets.';
      safeSend({
        type: 'error',
        message,
      });
      clientWs.close(1011, 'Gemini Live connection failed');
    }
  });

  // Mount Vite dev middleware in development or static dist in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Decision Arena server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
