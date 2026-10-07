/**
 * voiceSessionManager.ts — Foscentia Production Voice Session Manager
 *
 * Recognition lives on this class instance, never in React state.
 * Editor re-renders must not construct, stop, or replace the engine.
 *
 * Continuous dictation: Chrome's Web Speech session still ends after
 * speechend / network / internal limits. That is NOT a user pause.
 * We wait for the dead instance's onend, then start the next instance
 * (transparent rollover). We never start() while another instance is stopping.
 */

import {
  normalizeTranscriptText,
  reconcileOverlappingChunks,
  reconcileLiveDisplay,
} from "./transcriptReconciler";
import {
  resolveSpeechRecognitionLang,
  type SupportedSpeechLang,
} from "./voiceLang";

export type { SupportedSpeechLang };
export type VoiceState = "IDLE" | "LISTENING" | "PAUSED" | "RECOVERING" | "STOPPING" | "ERROR";

export interface VoiceSessionCallbacks {
  onFinalResult?: (fullFinalText: string, newChunk: string) => void;
  onInterimResult?: (interimText: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (errorMessage: string) => void;
}

export class VoiceSessionManager {
  private state: VoiceState = "IDLE";
  private language: SupportedSpeechLang = "bn-BD";

  private sessionId: string = "";
  /** Incremented only for intentional stop/pause so stale events are ignored. */
  private epoch: number = 0;
  private isIntentionalStop: boolean = false;
  private isIntentionalPause: boolean = false;
  /** User wants an active dictation session (listening or recovering). */
  private wantsListening: boolean = false;
  private isStarting: boolean = false;

  private accumulatedFinalText: string = "";
  private currentInterimText: string = "";
  private processedFinalCount: number = 0;

  private recognition: SpeechRecognitionLike | null = null;
  private mediaStream: MediaStream | null = null;
  private captureAudioStream: boolean = false;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrorCount: number = 0;

  private callbacks: VoiceSessionCallbacks = {};

  constructor(callbacks?: VoiceSessionCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  public setCallbacks(callbacks: VoiceSessionCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getAccumulatedFinal(): string {
    return this.accumulatedFinalText;
  }

  public getCurrentInterim(): string {
    return this.currentInterimText;
  }

  public getFullLiveText(): string {
    return reconcileLiveDisplay(this.accumulatedFinalText, this.currentInterimText);
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getLanguage(): SupportedSpeechLang {
    return this.language;
  }

  public setLanguage(lang: SupportedSpeechLang) {
    this.language = lang;
    if (this.wantsListening && this.recognition) {
      this.rolloverRecognition();
    }
  }

  private setState(newState: VoiceState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  private getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  public isBrowserSupported(): boolean {
    if (typeof window === "undefined") return true;
    const hasMedia = Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function");
    const hasWebSpeech = Boolean(this.getSpeechRecognitionClass());
    return hasMedia || hasWebSpeech;
  }

  public async start(options?: {
    language?: SupportedSpeechLang;
    reset?: boolean;
    captureAudioStream?: boolean;
  }): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const msg = "You are currently offline. Voice dictation requires an active connection.";
      this.setState("ERROR");
      this.callbacks.onError?.(msg);
      return;
    }

    if (options?.language) {
      this.language = options.language;
    }
    this.captureAudioStream = Boolean(options?.captureAudioStream);

    if (options?.reset !== false) {
      this.accumulatedFinalText = "";
      this.currentInterimText = "";
    }

    this.sessionId = `vsession_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.epoch += 1;
    this.isIntentionalStop = false;
    this.isIntentionalPause = false;
    this.wantsListening = true;
    this.consecutiveErrorCount = 0;
    this.processedFinalCount = 0;

    this.setState("LISTENING");

    if (this.captureAudioStream) {
      await this.ensureMediaStream();
    }

    this.ensureRecognitionRunning();
  }

  public pause(): void {
    if (this.state !== "LISTENING" && this.state !== "RECOVERING") return;

    this.isIntentionalPause = true;
    this.wantsListening = false;
    this.epoch += 1;
    this.setState("PAUSED");
    this.flushInterimToFinal();
    this.tearDownRecognition();
  }

  public async resume(): Promise<void> {
    if (this.state !== "PAUSED") return;

    this.isIntentionalPause = false;
    this.isIntentionalStop = false;
    this.wantsListening = true;
    this.epoch += 1;
    this.processedFinalCount = 0;
    this.setState("LISTENING");

    if (this.captureAudioStream) {
      await this.ensureMediaStream();
    }
    this.ensureRecognitionRunning();
  }

  public async stop(): Promise<string> {
    this.isIntentionalStop = true;
    this.isIntentionalPause = false;
    this.wantsListening = false;
    this.epoch += 1;
    this.setState("STOPPING");
    this.clearRecoveryTimer();
    this.flushInterimToFinal();
    this.tearDownRecognition();
    this.releaseMediaStream();

    const finalText = this.accumulatedFinalText.trim();
    this.setState("IDLE");
    return finalText;
  }

  public abort(): void {
    this.isIntentionalStop = true;
    this.isIntentionalPause = false;
    this.wantsListening = false;
    this.epoch += 1;
    this.clearRecoveryTimer();
    this.tearDownRecognition();
    this.releaseMediaStream();
    this.currentInterimText = "";
    this.callbacks.onInterimResult?.("");
    this.setState("IDLE");
  }

  public resetTranscript(): void {
    this.accumulatedFinalText = "";
    this.currentInterimText = "";
    this.processedFinalCount = 0;
    this.callbacks.onInterimResult?.("");
    this.callbacks.onFinalResult?.("", "");
  }

  /**
   * Clears session voice buffers without emitting editor-clearing callbacks.
   * Used when the user manually edits during an active session so the next
   * spoken words continue from the new caret instead of replaying old voice.
   */
  public clearVoiceBuffersSilent(): void {
    this.accumulatedFinalText = "";
    this.currentInterimText = "";
    this.processedFinalCount = 0;
  }

  private async ensureMediaStream(): Promise<MediaStream | null> {
    try {
      if (
        this.mediaStream &&
        this.mediaStream.active &&
        this.mediaStream.getAudioTracks().some((t) => t.readyState === "live")
      ) {
        return this.mediaStream;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      this.mediaStream = stream;
      return stream;
    } catch (err: unknown) {
      const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
      console.warn("[VoiceSessionManager] MediaStream acquisition warning:", err);
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        this.setState("ERROR");
        this.callbacks.onError?.(
          "Microphone access was denied. Please allow microphone permissions in your browser settings."
        );
      }
      return null;
    }
  }

  private releaseMediaStream() {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {
        /* ignore */
      }
      this.mediaStream = null;
    }
  }

  private clearRecoveryTimer() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  private tearDownRecognition() {
    const rec = this.recognition;
    this.recognition = null;
    this.isStarting = false;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onspeechend = null;
      rec.stop();
    } catch {
      /* ignore */
    }
  }

  /**
   * Request a new engine instance only after the current one has fully ended.
   */
  private rolloverRecognition() {
    if (!this.wantsListening) return;
    this.processedFinalCount = 0;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* onend will start the next instance */
      }
      return;
    }
    this.ensureRecognitionRunning();
  }

  private ensureRecognitionRunning() {
    if (!this.wantsListening || this.isIntentionalStop || this.isIntentionalPause) return;
    if (this.recognition || this.isStarting) return;
    this.startBrowserRecognition();
  }

  private startBrowserRecognition() {
    const SpeechRecognitionClass = this.getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      console.warn("[VoiceSessionManager] Web Speech API not supported in this browser.");
      return;
    }

    if (this.recognition || this.isStarting) return;

    const boundEpoch = this.epoch;
    this.isStarting = true;
    this.processedFinalCount = 0;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = resolveSpeechRecognitionLang(this.language);

    recognition.onresult = (event: SpeechRecognitionResultEventLike) => {
      if (boundEpoch !== this.epoch || this.isIntentionalStop || this.isIntentionalPause) {
        return;
      }

      this.consecutiveErrorCount = 0;
      let sessionInterim = "";
      const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;

      for (let i = startIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const piece = res[0]?.transcript || "";
        if (!piece) continue;

        if (res.isFinal) {
          const { merged, newChunk } = reconcileOverlappingChunks(
            this.accumulatedFinalText,
            piece
          );

          this.accumulatedFinalText = merged;
          this.currentInterimText = "";
          this.callbacks.onInterimResult?.("");
          if (newChunk) {
            this.callbacks.onFinalResult?.(merged, newChunk);
          }
        } else {
          sessionInterim += piece;
        }
      }

      if (sessionInterim) {
        const cleanInterim = normalizeTranscriptText(sessionInterim);
        this.currentInterimText = cleanInterim;
        this.callbacks.onInterimResult?.(cleanInterim);
      }
    };

    recognition.onerror = (event: { error?: string }) => {
      if (boundEpoch !== this.epoch) return;

      const errorType = event.error || "unknown";

      if (errorType === "not-allowed" || errorType === "service-not-allowed") {
        console.warn(`[VoiceSessionManager] Permission error: ${errorType}`);
        this.wantsListening = false;
        this.setState("ERROR");
        this.callbacks.onError?.(
          "Microphone access was denied. Please allow microphone permissions."
        );
        void this.stop();
        return;
      }

      // no-speech / aborted / network / audio-capture: engine will fire onend.
      // Rollover happens there. Do not treat speech pauses as user-stop.
      if (
        errorType === "no-speech" ||
        errorType === "aborted" ||
        errorType === "network" ||
        errorType === "audio-capture"
      ) {
        return;
      }

      console.warn(`[VoiceSessionManager] Recognition transient error (${errorType}):`, event);
      this.consecutiveErrorCount++;
      if (this.consecutiveErrorCount > 10) {
        this.setState("RECOVERING");
      }
    };

    recognition.onspeechend = () => {
      // Chrome fires speechend on a natural pause. continuous=true should keep
      // the session; if it still ends, onend performs rollover.
    };

    recognition.onend = () => {
      this.isStarting = false;
      if (this.recognition === recognition) {
        this.recognition = null;
      }

      if (boundEpoch !== this.epoch || this.isIntentionalStop || this.isIntentionalPause || !this.wantsListening) {
        return;
      }

      this.setState("RECOVERING");
      this.flushInterimToFinal();
      this.processedFinalCount = 0;

      this.clearRecoveryTimer();
      // Wait until this instance is fully dead before constructing the next one.
      this.recoveryTimer = setTimeout(() => {
        this.recoveryTimer = null;
        if (!this.wantsListening || this.isIntentionalStop || this.isIntentionalPause) return;
        if (this.recognition) return;
        this.setState("LISTENING");
        this.startBrowserRecognition();
      }, 0);
    };

    try {
      recognition.start();
      this.recognition = recognition;
      this.isStarting = false;
    } catch (startErr: unknown) {
      this.isStarting = false;
      this.recognition = null;
      console.warn("[VoiceSessionManager] Recognition start retry:", startErr);
      if (this.wantsListening && !this.isIntentionalStop && !this.isIntentionalPause) {
        this.setState("RECOVERING");
        this.clearRecoveryTimer();
        this.recoveryTimer = setTimeout(() => {
          this.recoveryTimer = null;
          this.ensureRecognitionRunning();
        }, 160);
      }
    }
  }

  private flushInterimToFinal() {
    const pending = (this.currentInterimText || "").trim();
    if (pending) {
      const { merged, newChunk } = reconcileOverlappingChunks(
        this.accumulatedFinalText,
        pending
      );
      this.accumulatedFinalText = merged;
      if (newChunk) {
        this.callbacks.onFinalResult?.(merged, newChunk);
      }
      this.currentInterimText = "";
      this.callbacks.onInterimResult?.("");
    }
  }

  public destroy() {
    this.abort();
    this.callbacks = {};
  }
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
}
