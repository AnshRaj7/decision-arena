import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Sliders,
  Send,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import {
  Comparison,
  NavSection,
  ProposedComparisonDraft,
  VoiceTranscriptEntry,
} from '../types/decision';
import {
  calculateComparisonScores,
  convertProposedDraftToComparison,
  formatScore,
  getNormalizedWeightPct,
} from '../utils/calculations';

interface VoiceAssistantViewProps {
  precision: 1 | 2;
  onApproveDraft: (comparison: Comparison, targetSection: NavSection) => void;
  onActiveStateChange?: (isActive: boolean) => void;
  focusTrigger?: number;
}

type ConnectionState =
  | 'idle'
  | 'requesting_permissions'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected';

type MicPermissionState = 'prompt' | 'granted' | 'denied';

const AVAILABLE_VOICES = [
  { id: 'Zephyr', label: 'Zephyr (Balanced & Clear)' },
  { id: 'Kore', label: 'Kore (Warm & Articulate)' },
  { id: 'Puck', label: 'Puck (Energetic & Direct)' },
  { id: 'Charon', label: 'Charon (Calm & Analytical)' },
  { id: 'Fenrir', label: 'Fenrir (Deep & Steady)' },
];

const QUICK_PROMPTS = [
  {
    lang: 'English',
    text: 'Help me compare 3 laptops for computer science under $1500.',
  },
  {
    lang: 'Hinglish',
    text: 'Mujhe 3 cloud platforms compare karne hain startup ke liye — AWS, GCP aur Azure.',
  },
  {
    lang: 'Hindi',
    text: 'मुझे मास्टर्स डिग्री के लिए दो यूनिवर्सिटी ऑफ़र की तुलना करने में मदद करें।',
  },
];

function float32ToPcm16Base64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

export const VoiceAssistantView: React.FC<VoiceAssistantViewProps> = ({
  precision,
  onApproveDraft,
  onActiveStateChange,
  focusTrigger = 0,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [micPermission, setMicPermission] = useState<MicPermissionState>('prompt');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [transcripts, setTranscripts] = useState<VoiceTranscriptEntry[]>([]);
  const [proposedDraft, setProposedDraft] = useState<ProposedComparisonDraft | null>(
    null
  );
  const [draftApprovedBanner, setDraftApprovedBanner] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isStageHighlighted, setIsStageHighlighted] = useState(false);

  // Refs for WebSocket and AudioContexts to avoid stale closures in audio callbacks
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isMicMutedRef = useRef<boolean>(false);
  const nextStartTimeRef = useRef<number>(0);
  const activePlaybackNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const latestDraftRef = useRef<ProposedComparisonDraft | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    latestDraftRef.current = proposedDraft;
  }, [proposedDraft]);

  useEffect(() => {
    onActiveStateChange?.(
      connectionState === 'connected' || connectionState === 'connecting'
    );
  }, [connectionState, onActiveStateChange]);

  useEffect(() => {
    if (focusTrigger > 0) {
      stageContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      primaryButtonRef.current?.focus({ preventScroll: true });
      setIsStageHighlighted(true);
      const timer = setTimeout(() => setIsStageHighlighted(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [focusTrigger]);

  // Check server Gemini API configuration on mount
  useEffect(() => {
    fetch('/api/live/status')
      .then((r) => r.json())
      .then((data) => {
        setApiConfigured(Boolean(data.configured));
      })
      .catch(() => {
        setApiConfigured(false);
      });
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, []);

  const appendOrMergeTranscript = (
    role: 'user' | 'assistant' | 'system',
    text: string
  ) => {
    const cleaned = text;
    if (!cleaned) return;

    setTranscripts((prev) => {
      if (prev.length > 0 && role !== 'system') {
        const last = prev[prev.length - 1];
        if (last.role === role) {
          const updatedLast: VoiceTranscriptEntry = {
            ...last,
            text: `${last.text}${cleaned}`,
          };
          return [...prev.slice(0, -1), updatedLast];
        }
      }
      return [
        ...prev,
        {
          id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role,
          text: cleaned,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        },
      ];
    });
  };

  const stopAllPlayback = () => {
    activePlaybackNodesRef.current.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    activePlaybackNodesRef.current.clear();
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsAiSpeaking(false);
  };

  const playPcm24kChunk = (base64Audio: string) => {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx) return;

    if (outCtx.state === 'suspended') {
      outCtx.resume().catch(() => {});
    }

    const float32Samples = pcm16Base64ToFloat32(base64Audio);
    if (float32Samples.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, float32Samples.length, 24000);
    audioBuffer.getChannelData(0).set(float32Samples);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    activePlaybackNodesRef.current.add(source);
    setIsAiSpeaking(true);

    source.onended = () => {
      activePlaybackNodesRef.current.delete(source);
      if (activePlaybackNodesRef.current.size === 0) {
        setIsAiSpeaking(false);
      }
    };

    source.start(startTime);
  };

  const cleanupSession = () => {
    stopAllPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setIsUserSpeaking(false);
    setIsAiSpeaking(false);
    setMicLevel(0);
  };

  const startConversation = async () => {
    cleanupSession();
    setErrorMessage(null);
    setDraftApprovedBanner(false);
    setConnectionState('requesting_permissions');

    // 1. Request Microphone Access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      setMicPermission('granted');
    } catch (err: any) {
      setMicPermission('denied');
      setConnectionState('error');
      setErrorMessage(
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser address bar and click Reconnect.'
          : `Could not access microphone: ${err?.message || 'Unknown device error'}`
      );
      return;
    }

    // 2. Request Short-Lived Ephemeral Session Token from Backend
    setConnectionState('connecting');
    let sessionToken = '';
    try {
      const tokenRes = await fetch('/api/live/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceName: selectedVoice }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(
          tokenData.error ||
            'Failed to obtain short-lived Gemini Live session token from backend.'
        );
      }
      sessionToken = tokenData.token;
      setApiConfigured(true);
    } catch (err: any) {
      cleanupSession();
      setConnectionState('error');
      setErrorMessage(
        err?.message ||
          'Could not generate ephemeral session token. Verify GEMINI_API_KEY in AI Studio Secrets.'
      );
      return;
    }

    // 3. Initialize 16kHz Input AudioContext and 24kHz Output AudioContext
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const inCtx = new AudioCtx({ sampleRate: 16000 });
      const outCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inCtx;
      outputAudioCtxRef.current = outCtx;
      nextStartTimeRef.current = outCtx.currentTime;

      // 4. Open WebSocket to /live with short-lived token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?token=${encodeURIComponent(
        sessionToken
      )}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            setConnectionState('connected');
            appendOrMergeTranscript(
              'system',
              `Connected to Gemini Live (${msg.model}) · Voice: ${msg.voiceName}. Speak in English, Hindi, or Hinglish.`
            );

            // Start streaming 16kHz PCM microphone audio
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (isMicMutedRef.current || ws.readyState !== WebSocket.OPEN) {
                setIsUserSpeaking(false);
                setMicLevel(0);
                return;
              }
              const channelData = e.inputBuffer.getChannelData(0);

              // Calculate RMS volume for live listening visualization
              let sumSquares = 0;
              for (let i = 0; i < channelData.length; i++) {
                sumSquares += channelData[i] * channelData[i];
              }
              const rms = Math.sqrt(sumSquares / channelData.length);
              const normalizedLevel = Math.min(1, rms * 8);
              setMicLevel(normalizedLevel);
              setIsUserSpeaking(rms > 0.018);

              const base64Audio = float32ToPcm16Base64(channelData);
              ws.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
            };

            source.connect(processor);
            processor.connect(inCtx.destination);
          } else if (msg.type === 'audio' && msg.audio) {
            playPcm24kChunk(msg.audio);
          } else if (msg.type === 'input_transcription' && msg.text) {
            appendOrMergeTranscript('user', msg.text);
          } else if (msg.type === 'output_transcription' && msg.text) {
            appendOrMergeTranscript('assistant', msg.text);
          } else if (msg.type === 'interrupted') {
            stopAllPlayback();
          } else if (msg.type === 'draft_proposed' && msg.draft) {
            setProposedDraft(msg.draft);
            setDraftApprovedBanner(false);
            appendOrMergeTranscript(
              'system',
              `Updated Comparison Draft: "${msg.draft.title}" (${
                msg.draft.options?.length || 0
              } options, ${msg.draft.criteria?.length || 0} criteria). Review & approve to populate the New Comparison form.`
            );
          } else if (msg.type === 'draft_confirmed' && msg.confirmed) {
            if (latestDraftRef.current) {
              const converted = convertProposedDraftToComparison(
                latestDraftRef.current
              );
              setDraftApprovedBanner(true);
              onApproveDraft(converted, 'new-comparison');
            }
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message || 'Gemini Live API session error.');
            setConnectionState('error');
          } else if (msg.type === 'session_closed') {
            setConnectionState((prev) =>
              prev === 'error' ? 'error' : 'disconnected'
            );
          }
        } catch {
          // ignore parse error
        }
      };

      ws.onerror = () => {
        setErrorMessage(
          'WebSocket connection error occurred while communicating with Gemini Live server.'
        );
        setConnectionState('error');
      };

      ws.onclose = () => {
        setConnectionState((prev) =>
          prev === 'error' || prev === 'idle' ? prev : 'disconnected'
        );
        setIsAiSpeaking(false);
        setIsUserSpeaking(false);
      };
    } catch (err: any) {
      cleanupSession();
      setConnectionState('error');
      setErrorMessage(err?.message || 'Failed to initialize audio pipeline.');
    }
  };

  const stopConversation = () => {
    cleanupSession();
    setConnectionState('disconnected');
    appendOrMergeTranscript('system', 'Voice conversation ended by user.');
  };

  const handleSendTextToLive = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;
    if (
      connectionState === 'connected' &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
      appendOrMergeTranscript('user', ` ${trimmed}`);
      setTextInput('');
    }
  };

  // Convert proposedDraft to a full Comparison object to preview live weighted scores
  const previewComparison = useMemo(() => {
    if (!proposedDraft) return null;
    return convertProposedDraftToComparison(proposedDraft);
  }, [proposedDraft]);

  const previewCalculation = useMemo(() => {
    if (!previewComparison) return null;
    return calculateComparisonScores(previewComparison);
  }, [previewComparison]);

  const handleManualApproveDraft = (targetSection: NavSection) => {
    if (!previewComparison) return;
    setDraftApprovedBanner(true);
    onApproveDraft(previewComparison, targetSection);
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Gemini Live API (gemini-3.8-live)</span>
            <span>·</span>
            <span>English / हिंदी / Hinglish</span>
            <span>·</span>
            <span>Ephemeral Server Token</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Voice Decision Assistant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Speak naturally in English, Hindi, or Hinglish to brainstorm options, criteria, weights, and ratings in real time.
          </p>
        </div>

        {/* Voice Selector & Connection Status Readout */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={selectedVoice}
            disabled={connectionState === 'connected' || connectionState === 'connecting'}
            onChange={(e) => setSelectedVoice(e.target.value)}
            aria-label="Select AI Voice Persona"
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          >
            {AVAILABLE_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                Voice: {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Missing API Key Warning Banner if not configured */}
      {apiConfigured === false && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-700 dark:text-amber-300">
              GEMINI_API_KEY Setup Required in Secrets
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              The backend ephemeral token service could not find a valid{' '}
              <code className="font-mono text-amber-600 dark:text-amber-300">
                GEMINI_API_KEY
              </code>
              . Please add your Gemini API key in the AI Studio{' '}
              <strong>Settings &gt; Secrets</strong> panel and click{' '}
              <strong>Start Conversation</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Error & Reconnect Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-rose-600 dark:text-rose-300">
                Voice Connection Issue
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                {errorMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startConversation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {/* Main Split Grid: Left Voice Studio & Transcript (7 cols) | Right Live Comparison Draft Preview (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Live Voice Orb, Status Bar & Real-Time Transcript */}
        <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-[#131C31] border border-cyan-500/35 dark:border-cyan-500/40 shadow-[0_0_30px_-12px_rgba(6,182,212,0.25)] p-5 sm:p-6 flex flex-col justify-between space-y-6">
          {/* Status Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">
                Status:{' '}
                <span
                  className={
                    connectionState === 'connected'
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : connectionState === 'connecting' ||
                        connectionState === 'requesting_permissions'
                      ? 'text-indigo-500 dark:text-indigo-400'
                      : connectionState === 'error'
                      ? 'text-rose-500'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {connectionState === 'idle' && 'Ready to Connect'}
                  {connectionState === 'requesting_permissions' &&
                    'Requesting Microphone Access...'}
                  {connectionState === 'connecting' &&
                    'Issuing Ephemeral Token & Connecting...'}
                  {connectionState === 'connected' && 'Live Session Active'}
                  {connectionState === 'disconnected' && 'Session Disconnected'}
                  {connectionState === 'error' && 'Connection Error'}
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                Mic:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {micPermission === 'granted'
                    ? isMicMuted
                      ? 'Muted'
                      : 'Authorized (16kHz PCM)'
                    : micPermission === 'denied'
                    ? 'Blocked'
                    : 'Standby'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Languages className="w-3.5 h-3.5 text-cyan-500" />
              <span>EN · हिं · Hinglish</span>
            </div>
          </div>

          {/* Central Live Listening & AI Speaking Visualizer Stage */}
          <div
            ref={stageContainerRef}
            className={`py-6 px-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120]/90 border flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-200 ${
              isStageHighlighted
                ? 'border-cyan-400 shadow-[0_0_28px_rgba(6,182,212,0.45)]'
                : 'border-slate-200/80 dark:border-slate-800/90'
            }`}
          >
            {/* Dual Indicators: Live Listening vs AI Speaking */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* Live Listening Indicator */}
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-150 ${
                  connectionState === 'connected' && !isMicMuted && isUserSpeaking
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-600 dark:text-cyan-300 shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)]'
                    : connectionState === 'connected' && !isMicMuted
                    ? 'bg-slate-100 dark:bg-[#131C31] border-cyan-500/30 text-slate-700 dark:text-slate-300'
                    : 'bg-slate-100 dark:bg-[#131C31] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                <Mic className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold leading-none">
                    {connectionState === 'connected'
                      ? isMicMuted
                        ? 'Mic Muted'
                        : isUserSpeaking
                        ? 'Listening to You...'
                        : 'Listening Ready'
                      : 'Mic Standby'}
                  </p>
                  <div className="w-20 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-75"
                      style={{
                        width:
                          connectionState === 'connected' && !isMicMuted
                            ? `${Math.max(12, Math.round(micLevel * 100))}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Speaking Indicator */}
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-150 ${
                  isAiSpeaking
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-600 dark:text-indigo-300 shadow-[0_0_20px_-4px_rgba(99,102,241,0.55)]'
                    : 'bg-slate-100 dark:bg-[#131C31] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold leading-none">
                    {isAiSpeaking ? 'AI Speaking (24kHz)' : 'AI Voice Idle'}
                  </p>
                  <div className="flex items-end gap-1 h-2.5 mt-1">
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          isAiSpeaking
                            ? 'bg-gradient-to-t from-cyan-400 to-indigo-400 h-2.5'
                            : 'bg-slate-300 dark:bg-slate-700 h-1'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Start / Stop Conversation Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {connectionState !== 'connected' ? (
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={startConversation}
                  disabled={
                    connectionState === 'connecting' ||
                    connectionState === 'requesting_permissions'
                  }
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_25px_-4px_rgba(6,182,212,0.65)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>
                    {connectionState === 'connecting' ||
                    connectionState === 'requesting_permissions'
                      ? 'Connecting Live Session...'
                      : connectionState === 'disconnected' ||
                        connectionState === 'error'
                      ? 'Reconnect Conversation'
                      : 'Start Conversation'}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsMicMuted(!isMicMuted)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      isMicMuted
                        ? 'bg-amber-500/15 border-amber-400 text-amber-600 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-[#1E293B] border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-cyan-400'
                    }`}
                  >
                    {isMicMuted ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>Unmute Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-cyan-400" />
                        <span>Mute Mic</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={stopConversation}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-xs transition-colors cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Stop Conversation</span>
                  </button>
                </>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 max-w-md">
              {connectionState === 'connected'
                ? 'Tell the assistant what you want to compare (e.g., "Help me compare 3 laptops" or "मुझे 2 जॉब ऑफर्स की तुलना करनी है").'
                : 'Click Start Conversation to open a real-time bidirectional Gemini Live voice stream.'}
            </p>
          </div>

          {/* Starter Prompts (Speak or Click when Connected) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Example Voice Prompts (Speak aloud or click while connected):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.lang}
                  type="button"
                  onClick={() => handleSendTextToLive(item.text)}
                  disabled={connectionState !== 'connected'}
                  className="p-2.5 rounded-xl text-left bg-slate-50 dark:bg-[#172136] border border-slate-200 dark:border-slate-800 hover:border-cyan-400/60 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 block mb-0.5">
                    {item.lang}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                    "{item.text}"
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Conversation Transcript */}
          <div className="flex-1 flex flex-col min-h-[240px] max-h-[340px] rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                <span>Live Conversation Transcript</span>
              </div>
              {transcripts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTranscripts([])}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Clear Transcript
                </button>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-8">
                  <p>
                    Real-time speech transcriptions (English, Hindi &amp; Hinglish) will appear here during your conversation.
                  </p>
                </div>
              ) : (
                transcripts.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex flex-col ${
                      entry.role === 'user'
                        ? 'items-end'
                        : entry.role === 'assistant'
                        ? 'items-start'
                        : 'items-center'
                    }`}
                  >
                    {entry.role === 'system' ? (
                      <div className="px-3 py-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-300 text-center max-w-md">
                        {entry.text}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                          entry.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-[#151F34] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 dark:text-slate-400 mb-1">
                          <span className="font-bold">
                            {entry.role === 'user' ? 'You' : 'Decision Arena AI'}
                          </span>
                          <span className="font-mono tabular-nums">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {entry.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Optional Text Input Bar for Hybrid Voice + Text inside Live Session */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTextToLive(textInput);
              }}
              className="p-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-[#131C31]"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={connectionState !== 'connected'}
                placeholder={
                  connectionState === 'connected'
                    ? 'Or type a message to the live voice assistant...'
                    : 'Start voice conversation to speak or send messages...'
                }
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={connectionState !== 'connected' || !textInput.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Proposed Comparison Draft & Confirmation Card */}
        <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Proposed Comparison Draft
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Populates the New Comparison form only after you confirm.
                </p>
              </div>
              <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>

            {draftApprovedBanner && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Draft approved and populated into your New Comparison form!
                </span>
              </div>
            )}

            {!previewComparison || !previewCalculation ? (
              <div className="my-8 py-12 px-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Draft Proposed Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  As you talk with the AI Voice Assistant about your decision goal, options, criteria, and ratings, a live structured comparison draft will appear here for your review.
                </p>
                <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
                  <p>1. Share your decision goal</p>
                  <p>2. Discuss 2–3 options &amp; criteria weights</p>
                  <p>3. Review &amp; approve the generated draft</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                {/* Draft Title & Category */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#172136] border border-cyan-500/30">
                  <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                    <span>{previewComparison.category}</span>
                    <span>Awaiting Confirmation</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {previewComparison.title}
                  </h3>
                </div>

                {/* Options & Live Weighted Preview Scores */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Proposed Options &amp; Weighted Score Preview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {previewCalculation.rankedResults.map((res) => {
                      const isTop = res.rank === 1;
                      return (
                        <div
                          key={res.option.id}
                          className={`p-3 rounded-xl border ${
                            isTop
                              ? 'bg-gradient-to-b from-cyan-500/15 to-indigo-500/10 border-cyan-400/70'
                              : 'bg-slate-50 dark:bg-[#172136] border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span
                              className={
                                isTop
                                  ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              #{res.rank}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatScore(res.weightedScore, precision)}/10
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                            {res.option.name}
                          </p>
                          {res.option.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {res.option.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proposed Criteria & Ratings Matrix */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <span>Proposed Criteria &amp; Ratings (1–10)</span>
                    <span className="font-mono text-slate-400 font-normal">
                      Total Weight: {previewCalculation.totalWeight}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                          <th className="py-2 px-3">Criterion</th>
                          <th className="py-2 px-2 text-right">Weight</th>
                          {previewComparison.options.map((o) => (
                            <th
                              key={o.id}
                              className="py-2 px-2 text-right truncate max-w-[80px]"
                            >
                              {o.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                        {previewComparison.criteria.map((c) => {
                          const pct = getNormalizedWeightPct(
                            c.weight,
                            previewCalculation.totalWeight
                          );
                          return (
                            <tr key={c.id}>
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                                {c.name}
                              </td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                                {c.weight}/10 ({pct.toFixed(0)}%)
                              </td>
                              {previewComparison.options.map((o) => (
                                <td
                                  key={o.id}
                                  className="py-2 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white"
                                >
                                  {previewComparison.ratings[o.id]?.[c.id] ?? 7}/10
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Footer Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {previewComparison ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleManualApproveDraft('new-comparison')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.55)] transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve &amp; Populate New Comparison</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleManualApproveDraft('results')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <span>Approve &amp; View Results</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>
                  Your existing comparison will not be overwritten until you explicitly approve a draft.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantView;

