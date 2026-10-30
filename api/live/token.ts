import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Type } from '@google/genai';

const ALLOWED_VOICES = ['Zephyr', 'Puck', 'Kore', 'Charon', 'Fenrir'] as const;

export const VOICE_ASSISTANT_SYSTEM_INSTRUCTION = `You are the Decision Arena AI Voice Assistant, an intelligent, warm, and structured decision-making coach built into the "Decision Arena" web application.

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

export const proposeComparisonDraftTool = {
  name: 'proposeComparisonDraft',
  description:
    'Creates or updates a structured comparison draft (2 or 3 options, custom criteria with weights 1-10, and ratings 1-10 for every option-criterion pair) and displays it in the user interface for review before confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description:
          'Clear title for the comparison, e.g., "Best Engineering Laptop" or "Cloud Platform Choice".',
      },
      category: {
        type: Type.STRING,
        description:
          'Short category label, e.g., "Hardware", "Career", "Academic", "Tech".',
      },
      options: {
        type: Type.ARRAY,
        description: 'List of 2 or 3 options being compared.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description:
                'Custom name of the option (e.g., "MacBook Air M3", "ThinkPad X1").',
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
        description:
          'List of evaluation criteria (typically 3 to 6 criteria) with weights from 1 to 10.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description:
                'Name of the criterion (e.g., "Battery Life", "Pricing", "Performance").',
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

export const confirmComparisonDraftTool = {
  name: 'confirmComparisonDraft',
  description:
    'Confirms and populates the approved comparison draft into the user’s New Comparison form. Call this ONLY after the user explicitly approves or confirms the proposed comparison draft.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: {
        type: Type.BOOLEAN,
        description:
          'Set to true when the user confirms they want to apply the draft.',
      },
    },
    required: ['confirmed'],
  },
};

export function getServerGeminiApiKey(): string {
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

export function buildGeminiLiveSetupPayload(voiceName: string) {
  return {
    setup: {
      model: 'models/gemini-3.8-live',
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: VOICE_ASSISTANT_SYSTEM_INSTRUCTION }],
      },
      tools: [
        {
          functionDeclarations: [
            proposeComparisonDraftTool,
            confirmComparisonDraftTool,
          ],
        },
      ],
    },
  };
}

async function parseRequestBody(
  req: IncomingMessage & { body?: any }
): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: IncomingMessage & { method?: string; body?: any },
  res: ServerResponse
) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method && req.method !== 'POST') {
    sendJson(res, 405, {
      error: `Method ${req.method} Not Allowed. Use POST /api/live/token.`,
    });
    return;
  }

  const apiKey = getServerGeminiApiKey();
  if (!apiKey) {
    sendJson(res, 503, {
      error:
        'GEMINI_API_KEY is not configured on the server. On Vercel, add GEMINI_API_KEY in Project Settings → Environment Variables and redeploy. On Google AI Studio, add GEMINI_API_KEY in Settings → Secrets.',
      code: 'MISSING_GEMINI_API_KEY',
    });
    return;
  }

  const body = await parseRequestBody(req);
  const requestedVoice =
    typeof body?.voiceName === 'string' &&
    (ALLOWED_VOICES as readonly string[]).includes(body.voiceName)
      ? body.voiceName
      : 'Zephyr';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1alpha',
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString();

    const authToken = await ai.authTokens.create({
      config: {
        uses: 3,
        expireTime,
        newSessionExpireTime,
      },
    });

    const ephemeralTokenName = authToken?.name;
    if (!ephemeralTokenName) {
      sendJson(res, 502, {
        error:
          'Google Gemini API did not return an ephemeral auth token. Please verify your GEMINI_API_KEY.',
        code: 'EMPTY_EPHEMERAL_TOKEN',
      });
      return;
    }

    const wsEndpoint = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(
      ephemeralTokenName
    )}`;

    const setupPayload = buildGeminiLiveSetupPayload(requestedVoice);

    sendJson(res, 200, {
      token: ephemeralTokenName,
      wsEndpoint,
      setupPayload,
      expiresAt: newSessionExpireTime,
      model: 'gemini-3.8-live',
      voiceName: requestedVoice,
    });
  } catch (err: any) {
    const rawMsg = err?.message || 'Failed to generate ephemeral session token.';
    const isAuthError =
      rawMsg.includes('API_KEY_INVALID') ||
      rawMsg.includes('400') ||
      rawMsg.includes('401') ||
      rawMsg.includes('403') ||
      rawMsg.includes('PERMISSION_DENIED');

    sendJson(res, isAuthError ? 401 : 500, {
      error: isAuthError
        ? 'Invalid or unauthorized GEMINI_API_KEY. Please check the GEMINI_API_KEY value in your Vercel Environment Variables or AI Studio Secrets.'
        : `Failed to create Gemini Live ephemeral token: ${rawMsg}`,
      code: isAuthError ? 'INVALID_GEMINI_API_KEY' : 'TOKEN_GENERATION_FAILED',
    });
  }
}
