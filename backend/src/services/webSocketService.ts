import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

interface StreamState {
  text: string;
  confidence: number;
  isFinal: boolean;
  start: number;
  duration: number;
  updatedAt: number;
}

export function setupWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/api/ai/transcribe-stream' });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const languageHint = (url.searchParams.get('language') || 'auto').toLowerCase();

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('[WebSocket ASR] DEEPGRAM_API_KEY environment variable is not configured.');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'DEEPGRAM_API_KEY environment variable is not configured on the backend server.'
      }));
      ws.close(1008, 'Missing Deepgram API Key');
      return;
    }

    // High-accuracy continuous speech configuration:
    // endpointing=650: 650ms natural pause prevents cutting off continuous speech prematurely while keeping latency responsive
    // utterance_end_ms=1000: fallback speech boundary detection
    // numerals=true & smart_format=true: formats digits, numbers, currencies, and percentages properly
    const dgBaseUrl = 'wss://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&numerals=true&interim_results=true&endpointing=650&utterance_end_ms=1000';

    // Sessions map: session name -> WebSocket
    const activeSessions: { [key: string]: WebSocket } = {};
    const audioBuffer: any[] = [];
    let isAnyOpen = false;
    let isClientClosed = false;

    // Track arbitration state for automatic bilingual recognition (Bengali / English)
    const stateBn: StreamState = { text: '', confidence: 0, isFinal: false, start: 0, duration: 0, updatedAt: 0 };
    const stateEn: StreamState = { text: '', confidence: 0, isFinal: false, start: 0, duration: 0, updatedAt: 0 };
    
    let activeUtteranceLang: 'bn' | 'en' | null = null;
    let lastFinalizedAudioTime = -1;
    let lastSentFinalText = '';
    let lastSentInterimText = '';

    const createDgConnection = (sessionName: string, queryParams: string) => {
      const fullUrl = `${dgBaseUrl}&${queryParams}`;
      const dgWs = new WebSocket(fullUrl, {
        headers: { Authorization: `Token ${deepgramApiKey}` }
      });

      activeSessions[sessionName] = dgWs;

      dgWs.on('open', () => {
        console.log(`[Deepgram] Connected session "${sessionName}"`);
        isAnyOpen = true;

        // Flush any audio chunks buffered before this session opened (EBML header & initial audio)
        if (audioBuffer.length > 0) {
          for (const chunk of audioBuffer) {
            if (dgWs.readyState === WebSocket.OPEN) {
              dgWs.send(chunk);
            }
          }
        }

        // Notify client that ASR provider is connected and ready
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ready', session: sessionName }));
        }
      });

      dgWs.on('message', (data: any) => {
        try {
          const response = JSON.parse(data.toString());
          const alt = response.channel?.alternatives?.[0];
          if (!alt) return;

          const transcript = (alt.transcript || '').trim();
          const confidence = typeof alt.confidence === 'number' ? alt.confidence : 0;
          const isFinal = Boolean(response.is_final);
          const start = typeof response.start === 'number' ? response.start : 0;
          const duration = typeof response.duration === 'number' ? response.duration : 0;
          const endTime = start + duration;

          // Ignore low-confidence noise / empty packets without finalizing
          if (!transcript && !isFinal) return;
          if (confidence < 0.35 && !isFinal) return;

          const now = Date.now();
          if (sessionName === 'bn') {
            stateBn.text = transcript;
            stateBn.confidence = confidence;
            stateBn.isFinal = isFinal;
            stateBn.start = start;
            stateBn.duration = duration;
            stateBn.updatedAt = now;
          } else {
            stateEn.text = transcript;
            stateEn.confidence = confidence;
            stateEn.isFinal = isFinal;
            stateEn.start = start;
            stateEn.duration = duration;
            stateEn.updatedAt = now;
          }

          // Single-session direct pass-through (user explicitly selected bn or en)
          if (Object.keys(activeSessions).length === 1) {
            if (transcript && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'transcript',
                is_final: isFinal,
                text: transcript,
                language: sessionName,
                confidence: confidence
              }));
            }
            return;
          }

          // --- Dual-Session Bilingual Arbitration ---
          const hasBnScript = /[\u0980-\u09FF]/.test(stateBn.text);
          const hasEnScript = /[a-zA-Z]/.test(stateEn.text);

          // Language arbitration:
          // 1. If English has high confidence (>= 0.70) and valid English words: speaker spoke English.
          //    (Deepgram Bengali model on English speech transliterates phonemes into Bengali script with lower confidence).
          // 2. If Bengali script is present and confidence >= 0.65 while English confidence is lower (< 0.75): speaker spoke Bengali.
          //    (Deepgram English model on Bengali speech outputs low-confidence garbled phonetic approximations).
          if (!activeUtteranceLang) {
            if (hasEnScript && stateEn.confidence >= 0.70 && stateEn.confidence > (stateBn.confidence - 0.05)) {
              activeUtteranceLang = 'en';
            } else if (hasBnScript && stateBn.confidence >= 0.60 && (!hasEnScript || stateEn.confidence < 0.70)) {
              activeUtteranceLang = 'bn';
            } else if (hasBnScript && stateBn.confidence > stateEn.confidence) {
              activeUtteranceLang = 'bn';
            } else if (hasEnScript && stateEn.confidence >= 0.50) {
              activeUtteranceLang = 'en';
            }
          }

          const currentLang = activeUtteranceLang || (hasBnScript ? 'bn' : (hasEnScript ? 'en' : (sessionName as 'bn' | 'en')));
          const currentText = currentLang === 'bn' ? stateBn.text : stateEn.text;
          const currentConf = currentLang === 'bn' ? stateBn.confidence : stateEn.confidence;

          if (isFinal) {
            // Guard against duplicate finals:
            // Since both 'bn' and 'en' receive the same audio, they will both finalize for the same segment.
            // If this audio window has already been finalized by the winning session, discard the duplicate from the other!
            if (endTime <= lastFinalizedAudioTime + 0.35 && lastFinalizedAudioTime > 0) {
              if (sessionName === 'bn') {
                stateBn.text = '';
                stateBn.confidence = 0;
                stateBn.isFinal = false;
              } else {
                stateEn.text = '';
                stateEn.confidence = 0;
                stateEn.isFinal = false;
              }
              return;
            }

            lastFinalizedAudioTime = endTime;

            let winningFinalText = currentText;
            let winningFinalLang = currentLang;

            // Fallback if the locked language had an empty string in this segment
            if (!winningFinalText) {
              if (sessionName === 'bn' && stateBn.text) {
                winningFinalText = stateBn.text;
                winningFinalLang = 'bn';
              } else if (sessionName === 'en' && stateEn.text) {
                winningFinalText = stateEn.text;
                winningFinalLang = 'en';
              }
            }

            if (winningFinalText && winningFinalText !== lastSentFinalText && ws.readyState === WebSocket.OPEN) {
              lastSentFinalText = winningFinalText;
              lastSentInterimText = '';
              ws.send(JSON.stringify({
                type: 'transcript',
                is_final: true,
                text: winningFinalText,
                language: winningFinalLang,
                confidence: currentConf
              }));
            }

            // Reset utterance tracking for the subsequent speech / utterance
            activeUtteranceLang = null;
            stateBn.text = '';
            stateBn.confidence = 0;
            stateBn.isFinal = false;
            stateEn.text = '';
            stateEn.confidence = 0;
            stateEn.isFinal = false;
          } else {
            // Send interim preview updates smoothly matching the active language without cross-session flickering
            if (currentText && currentText !== lastSentInterimText && ws.readyState === WebSocket.OPEN) {
              lastSentInterimText = currentText;
              ws.send(JSON.stringify({
                type: 'transcript',
                is_final: false,
                text: currentText,
                language: currentLang,
                confidence: currentConf
              }));
            }
          }
        } catch (err) {
          console.warn('[Deepgram] Error parsing message:', err);
        }
      });

      dgWs.on('close', (code, reason) => {
        console.log(`[Deepgram] Session "${sessionName}" closed: ${code} - ${reason.toString()}`);
        delete activeSessions[sessionName];

        if (Object.keys(activeSessions).length === 0 && !isClientClosed) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'ASR Provider completed stream');
          }
        }
      });

      dgWs.on('error', (err) => {
        console.error(`[Deepgram] Error in session "${sessionName}":`, err);
        delete activeSessions[sessionName];

        if (Object.keys(activeSessions).length === 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `ASR Provider Error: ${err.message || 'Deepgram stream connection failure'}`
          }));
        }
      });

      return dgWs;
    };

    // Determine sessions to launch based on languageHint
    if (languageHint === 'bn' || languageHint === 'bn-bd' || languageHint === 'bengali') {
      createDgConnection('bn', 'model=nova-3&language=bn');
    } else if (languageHint === 'en' || languageHint === 'en-us' || languageHint === 'english') {
      createDgConnection('en', 'model=nova-3&language=en');
    } else {
      // Automatic Multilingual Mode:
      // Launch both dedicated Nova-3 Bengali model and Nova-3 English model with real-time arbitration
      createDgConnection('bn', 'model=nova-3&language=bn');
      createDgConnection('en', 'model=nova-3&language=en');
    }

    ws.on('message', (message: any) => {
      if (isClientClosed) return;

      // If no Deepgram sessions are open yet, buffer the chunk (especially the initial WebM header chunk!)
      if (!isAnyOpen) {
        if (audioBuffer.length < 50) {
          audioBuffer.push(message);
        }
        return;
      }

      // Relay incoming audio chunks to all active Deepgram sessions
      for (const sessionName of Object.keys(activeSessions)) {
        const sessionWs = activeSessions[sessionName];
        if (sessionWs && sessionWs.readyState === WebSocket.OPEN) {
          sessionWs.send(message);
        }
      }
    });

    ws.on('close', () => {
      isClientClosed = true;
      audioBuffer.length = 0;

      for (const sessionName of Object.keys(activeSessions)) {
        const sessionWs = activeSessions[sessionName];
        if (sessionWs && sessionWs.readyState === WebSocket.OPEN) {
          try {
            sessionWs.send(JSON.stringify({ type: 'CloseStream' }));
            sessionWs.close();
          } catch (e) {}
        }
      }
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket Client] Error:', err);
    });
  });
}

