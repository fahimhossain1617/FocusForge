import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

interface StreamState {
  text: string;
  confidence: number;
  isFinal: boolean;
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

    const dgBaseUrl = 'wss://api.deepgram.com/v1/listen?smart_format=true&interim_results=true&endpointing=300';

    // Sessions map: session name -> WebSocket
    const activeSessions: { [key: string]: WebSocket } = {};
    const audioBuffer: any[] = [];
    let isAnyOpen = false;
    let isClientClosed = false;

    // Track latest recognition state for auto multilingual arbitration
    const stateBn: StreamState = { text: '', confidence: 0, isFinal: false, updatedAt: 0 };
    const stateMulti: StreamState = { text: '', confidence: 0, isFinal: false, updatedAt: 0 };
    let lastSentText = '';
    let activeUtteranceLang: 'bn' | 'en' | null = null;

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
          console.log(`[Deepgram] Flushing ${audioBuffer.length} buffered audio chunks to "${sessionName}"`);
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
          const confidence = alt.confidence || 0;
          const isFinal = Boolean(response.is_final);

          if (!transcript && !isFinal) return;

          const now = Date.now();
          if (sessionName === 'bn') {
            stateBn.text = transcript;
            stateBn.confidence = confidence;
            stateBn.isFinal = isFinal;
            stateBn.updatedAt = now;
          } else {
            stateMulti.text = transcript;
            stateMulti.confidence = confidence;
            stateMulti.isFinal = isFinal;
            stateMulti.updatedAt = now;
          }

          // If single session mode (bn-only or en-only requested), pass through directly
          if (Object.keys(activeSessions).length === 1) {
            if (transcript && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'transcript',
                is_final: isFinal,
                text: transcript,
                language: sessionName
              }));
            }
            return;
          }

          // Multilingual Arbitration: Bengali script (\u0980-\u09FF) uniquely identifies Bengali speech
          const hasBnChars = /[\u0980-\u09FF]/.test(stateBn.text);

          let winningText = '';
          let winningLang = 'auto';

          if (hasBnChars && (stateBn.confidence >= 0.65 || stateBn.confidence > stateMulti.confidence)) {
            winningText = stateBn.text;
            winningLang = 'bn';
          } else if (stateMulti.text && (stateMulti.confidence >= 0.60 || !hasBnChars)) {
            winningText = stateMulti.text;
            winningLang = 'en';
          } else {
            winningText = stateBn.text || stateMulti.text;
            winningLang = hasBnChars ? 'bn' : 'en';
          }

          if (winningText && winningText !== lastSentText && ws.readyState === WebSocket.OPEN) {
            lastSentText = isFinal ? '' : winningText;
            ws.send(JSON.stringify({
              type: 'transcript',
              is_final: isFinal,
              text: winningText,
              language: winningLang
            }));
          }

          if (isFinal) {
            // Unlock utterance language for subsequent speech/sentences
            activeUtteranceLang = null;
            lastSentText = '';
            stateBn.text = '';
            stateBn.confidence = 0;
            stateMulti.text = '';
            stateMulti.confidence = 0;
          }
        } catch (err) {
          console.warn('[Deepgram] Error parsing message:', err);
        }
      });

      dgWs.on('close', (code, reason) => {
        console.log(`[Deepgram] Session "${sessionName}" closed: ${code} - ${reason.toString()}`);
        delete activeSessions[sessionName];

        // If all sessions closed unexpectedly and client is still open
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
      // Launch both dedicated Nova-3 Bengali model and Nova-3 Multilingual model
      createDgConnection('bn', 'model=nova-3&language=bn');
      createDgConnection('multi', 'model=nova-3&language=multi');
    }

    ws.on('message', (message: any) => {
      if (isClientClosed) return;

      // If no Deepgram sessions are open yet, buffer the chunk (especially the initial WebM header chunk!)
      if (!isAnyOpen) {
        if (audioBuffer.length < 50) { // Limit buffer to avoid memory leaks
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
