/**
 * voiceSessionManager.ts — Foscentia Authoritative Voice Recognition Session Manager
 *
 * Requirements Guarantee:
 * 1. Single authoritative SpeechRecognition instance per session.
 * 2. Strict epoch & sessionId guards ignoring stale events from old/cancelled sessions.
 * 3. Deterministic transcript management:
 *    - committedBaseText: User-entered or previously finalized text.
 *    - sessionFinalTranscript: Finalized speech for the active session.
 *    - sessionInterimTranscript: Temporary hypothesis (never committed as final text).
 * 4. Idempotent finalization: Exactly ONE commit per recording session on Pause / Stop.
 * 5. Clean broadcast of speech activity for waveform & aura glow without hardware lockouts.
 */

import {
  normalizeTranscriptText,
  cleanPacketStutter,
  reconcileOverlappingChunks,
  mergeTranscripts,
} from "./transcriptReconciler";
import {
  resolveSpeechRecognitionLang,
  type SupportedSpeechLang,
} from "./voiceLang";
import { broadcastSpeechActivity } from "../../hooks/useVoiceAmplitude";

export type { SupportedSpeechLang };
export type VoiceState = "IDLE" | "RECORDING" | "STOPPING" | "FINALIZING" | "PAUSED" | "ERROR";

export interface VoiceSessionCallbacks {
  /** Called ONLY when a recording session is finalized on Stop / Pause */
  onFinalCommit?: (fullCommittedText: string, sessionDeltaChunk: string) => void;
  /** Internal live interim changes (not rendered into input during recording) */
  onInterimChange?: (interimText: string) => void;
  /** Internal session final accumulation */
  onSessionFinalChange?: (sessionFinalText: string) => void;
  /** State machine transitions */
  onStateChange?: (state: VoiceState) => void;
  /** User-actionable error messages */
  onError?: (errorMessage: string) => void;
}

export class VoiceSessionManager {
  private state: VoiceState = "IDLE";
  private language: SupportedSpeechLang = "bn-BD";

  private sessionId: string = "";
  private epoch: number = 0;
  private isStarting: boolean = false;
  private hasCommitted: boolean = false;

  private committedBaseText: string = "";
  private sessionFinalTranscript: string = "";
  private sessionInterimTranscript: string = "";

  private recognition: SpeechRecognitionLike | null = null;
  private safetyFinalizeTimer: ReturnType<typeof setTimeout> | null = null;
  private restartRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
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

  public getLanguage(): SupportedSpeechLang {
    return this.language;
  }

  public getCommittedBaseText(): string {
    return this.committedBaseText;
  }

  public getSessionFinalTranscript(): string {
    return this.sessionFinalTranscript;
  }

  public getSessionInterimTranscript(): string {
    return this.sessionInterimTranscript;
  }

  public isBrowserSupported(): boolean {
    if (typeof window === "undefined") return true;
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  private getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  private setState(newState: VoiceState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  /**
   * Starts a new authoritative voice recording session.
   * Does NOT alter the displayed input value while recording.
   */
  public async start(options?: {
    language?: SupportedSpeechLang;
    baseText?: string;
  }): Promise<void> {
    if (this.isStarting || this.state === "RECORDING" || this.state === "FINALIZING" || this.state === "STOPPING") {
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const msg = this.language === "bn-BD"
        ? "আপনি বর্তমানে অফলাইনে আছেন। ভয়েস ইনপুটের জন্য ইন্টারনেট কানেকশন প্রয়োজন।"
        : "You are currently offline. Voice dictation requires an active connection.";
      this.setState("ERROR");
      this.callbacks.onError?.(msg);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const msg = this.language === "bn-BD"
        ? "আপনি বর্তমানে অফলাইনে আছেন। ভয়েস ইনপুটের জন্য ইন্টারনেট প্রয়োজন।"
        : "You are currently offline. Voice input needs internet.";
      this.setState("IDLE");
      this.callbacks.onError?.(msg);
      return;
    }

    const SpeechRecognitionClass = this.getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      const msg = this.language === "bn-BD"
        ? "এই ব্রাউজারে ভয়েস রিকগনিশন সাপোর্ট করে না। ক্রোম বা এজ ব্যবহার করুন।"
        : "Speech recognition is not supported in this browser. Please use Chrome or Edge.";
      this.setState("ERROR");
      this.callbacks.onError?.(msg);
      return;
    }

    if (options?.language) {
      this.language = options.language;
    }

    // Clean up any stale lingering instances
    this.tearDownRecognition();
    this.clearAllTimers();

    this.epoch += 1;
    this.sessionId = `vses_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.isStarting = true;
    this.hasCommitted = false;
    this.consecutiveErrorCount = 0;

    // Anchor current user-entered base text
    this.committedBaseText = options?.baseText !== undefined ? options.baseText : this.committedBaseText;
    this.sessionFinalTranscript = "";
    this.sessionInterimTranscript = "";

    this.setState("RECORDING");

    this.startBrowserRecognitionInstance(this.epoch);
  }

  /**
   * Pause recording: Finalizes current voice audio into committed text and transitions to PAUSED state.
   */
  public async pause(): Promise<string> {
    if (this.state !== "RECORDING") {
      return this.committedBaseText;
    }

    return this.finishSession(true);
  }

  /**
   * Resume recording from PAUSED state.
   */
  public async resume(baseText?: string): Promise<void> {
    if (this.state !== "PAUSED" && this.state !== "IDLE") return;
    await this.start({ baseText: baseText !== undefined ? baseText : this.committedBaseText });
  }

  /**
   * Stop recording: Finalizes current voice audio into committed text and transitions to IDLE state.
   */
  public async stop(): Promise<string> {
    if (this.state !== "RECORDING" && this.state !== "FINALIZING" && this.state !== "STOPPING") {
      return this.committedBaseText;
    }

    return this.finishSession(false);
  }

  /**
   * Abort recording: Immediately discards current session audio without committing.
   */
  public abort(): void {
    this.epoch += 1;
    this.isStarting = false;
    this.hasCommitted = true; // prevent late commit
    this.clearAllTimers();
    this.tearDownRecognition();
    this.sessionFinalTranscript = "";
    this.sessionInterimTranscript = "";
    broadcastSpeechActivity(false);
    this.setState("IDLE");
  }

  /**
   * Syncs external manual typing into the committed base text memory.
   */
  public setManualBaseText(text: string): void {
    this.committedBaseText = text || "";
  }

  /**
   * Updates language setting. If actively recording, cleanly rolls over.
   */
  public setLanguage(newLang: SupportedSpeechLang): void {
    if (this.language === newLang) return;
    this.language = newLang;

    if (this.state === "RECORDING") {
      // Finalize current session first, then start new session in new language
      void this.stop().then((committed) => {
        void this.start({ language: newLang, baseText: committed });
      });
    }
  }

  /**
   * Internal runner to construct and start one native SpeechRecognition instance.
   */
  private startBrowserRecognitionInstance(boundEpoch: number) {
    const SpeechRecognitionClass = this.getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      this.isStarting = false;
      return;
    }

    let recognition: SpeechRecognitionLike;
    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = resolveSpeechRecognitionLang(this.language);
    } catch (err) {
      this.isStarting = false;
      return;
    }

    recognition.onstart = () => {
      if (this.epoch !== boundEpoch) return;
      this.isStarting = false;
      this.consecutiveErrorCount = 0;
    };

    recognition.onspeechstart = () => {
      if (this.epoch !== boundEpoch) return;
      broadcastSpeechActivity(true);
    };

    recognition.onsoundstart = () => {
      if (this.epoch !== boundEpoch) return;
      broadcastSpeechActivity(true);
    };

    recognition.onspeechend = () => {
      if (this.epoch !== boundEpoch) return;
      broadcastSpeechActivity(false);
    };

    recognition.onsoundend = () => {
      if (this.epoch !== boundEpoch) return;
      broadcastSpeechActivity(false);
    };

    recognition.onresult = (event: SpeechRecognitionResultEventLike) => {
      if (this.epoch !== boundEpoch) return;
      broadcastSpeechActivity(true);
      this.consecutiveErrorCount = 0;

      let newlyFinalizedPiece = "";
      let latestInterim = "";

      const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;

      for (let i = startIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const transcriptChunk = item[0]?.transcript || "";
        if (!transcriptChunk) continue;

        if (item.isFinal) {
          newlyFinalizedPiece += " " + transcriptChunk;
        } else {
          latestInterim = transcriptChunk;
        }
      }

      if (newlyFinalizedPiece.trim()) {
        const { merged } = reconcileOverlappingChunks(
          this.sessionFinalTranscript,
          newlyFinalizedPiece.trim()
        );
        this.sessionFinalTranscript = merged;
        this.sessionInterimTranscript = "";
        this.callbacks.onSessionFinalChange?.(merged);
        this.callbacks.onInterimChange?.("");
      } else if (latestInterim) {
        this.sessionInterimTranscript = latestInterim.trim();
        this.callbacks.onInterimChange?.(this.sessionInterimTranscript);
      }
    };

    recognition.onerror = (event: { error?: string }) => {
      if (this.epoch !== boundEpoch) return;
      const errorType = event?.error || "unknown";

      if (errorType === "no-speech" || errorType === "aborted") {
        broadcastSpeechActivity(false);
        return;
      }

      broadcastSpeechActivity(false);
      this.consecutiveErrorCount += 1;

      if (errorType === "not-allowed" || errorType === "service-not-allowed") {
        this.abort();
        this.setState("ERROR");
        this.callbacks.onError?.(
          this.language === "bn-BD"
            ? "মাইক্রোফোনের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে মাইক্রোফোন অ্যালাউ করুন।"
            : "Microphone permission denied. Please allow microphone access in browser settings."
        );
        return;
      }

      if (errorType === "audio-capture" || errorType === "network") {
        if (this.consecutiveErrorCount >= 3) {
          this.abort();
          this.setState("ERROR");
          this.callbacks.onError?.(
            this.language === "bn-BD"
              ? "মাইক্রোফোন বা নেটওয়ার্কে সমস্যা হচ্ছে। অনুগ্রহ করে সংযোগ পরীক্ষা করুন।"
              : "Microphone or network connection error. Please check your connection."
          );
        }
      }
    };

    recognition.onend = () => {
      if (this.epoch !== boundEpoch) return;
      broadcastSpeechActivity(false);
      this.isStarting = false;

      // If we are currently finalizing or stopping, execute final commitment
      if (this.state === "STOPPING" || this.state === "FINALIZING") {
        this.executeFinalCommit();
        return;
      }

      // Transparent rollover if recognition ended naturally while user is still in RECORDING mode
      if (this.state === "RECORDING" && this.consecutiveErrorCount < 3) {
        this.clearRestartRecoveryTimer();
        this.restartRecoveryTimer = setTimeout(() => {
          if (this.epoch === boundEpoch && this.state === "RECORDING") {
            this.startBrowserRecognitionInstance(boundEpoch);
          }
        }, 150);
      }
    };

    try {
      this.recognition = recognition;
      recognition.start();
    } catch (err) {
      this.isStarting = false;
      this.recognition = null;
      if (this.state === "RECORDING" && this.consecutiveErrorCount < 2) {
        this.consecutiveErrorCount += 1;
        this.clearRestartRecoveryTimer();
        this.restartRecoveryTimer = setTimeout(() => {
          if (this.epoch === boundEpoch && this.state === "RECORDING") {
            this.startBrowserRecognitionInstance(boundEpoch);
          }
        }, 250);
      }
    }
  }

  /**
   * Finalizes the current recording session cleanly and idempotently.
   */
  private async finishSession(isPause: boolean): Promise<string> {
    this.clearRestartRecoveryTimer();
    this.setState(isPause ? "FINALIZING" : "STOPPING");
    broadcastSpeechActivity(false);

    // Call stop() on native recognition to flush pending speech buffers
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    // Safety timeout: If browser does not fire onend within 350ms, force final commit
    return new Promise((resolve) => {
      this.clearSafetyFinalizeTimer();
      this.safetyFinalizeTimer = setTimeout(() => {
        const finalResult = this.executeFinalCommit(isPause);
        resolve(finalResult);
      }, 350);

      // If executeFinalCommit happens earlier via onend, resolve will be called
      const originalCommit = this.callbacks.onFinalCommit;
      this.callbacks.onFinalCommit = (fullText, chunk) => {
        originalCommit?.(fullText, chunk);
        resolve(fullText);
      };
    });
  }

  /**
   * Idempotent commit function that produces the final merged text and notifies listener once.
   */
  private executeFinalCommit(isPause: boolean = false): string {
    this.clearSafetyFinalizeTimer();
    this.clearRestartRecoveryTimer();

    if (this.hasCommitted) {
      return this.committedBaseText;
    }
    this.hasCommitted = true;

    // If there was an unfinalized interim hypothesis when stopping and sessionFinal was empty,
    // normalize and incorporate it so short words are not lost
    let finalSessionText = this.sessionFinalTranscript.trim();
    if (!finalSessionText && this.sessionInterimTranscript.trim()) {
      finalSessionText = normalizeTranscriptText(cleanPacketStutter(this.sessionInterimTranscript));
    }

    const mergedFullText = mergeTranscripts(this.committedBaseText, finalSessionText);

    // Update committedBaseText for next potential resume session
    this.committedBaseText = mergedFullText;
    this.sessionFinalTranscript = "";
    this.sessionInterimTranscript = "";

    // Clean up recognition
    this.tearDownRecognition();
    broadcastSpeechActivity(false);

    // Transition state
    this.setState(isPause ? "PAUSED" : "IDLE");

    // Invoke user commit callback EXACTLY ONCE
    this.callbacks.onFinalCommit?.(mergedFullText, finalSessionText);

    return mergedFullText;
  }

  private clearSafetyFinalizeTimer() {
    if (this.safetyFinalizeTimer) {
      clearTimeout(this.safetyFinalizeTimer);
      this.safetyFinalizeTimer = null;
    }
  }

  private clearRestartRecoveryTimer() {
    if (this.restartRecoveryTimer) {
      clearTimeout(this.restartRecoveryTimer);
      this.restartRecoveryTimer = null;
    }
  }

  private clearAllTimers() {
    this.clearSafetyFinalizeTimer();
    this.clearRestartRecoveryTimer();
  }

  private tearDownRecognition() {
    const rec = this.recognition;
    this.recognition = null;
    this.isStarting = false;
    if (!rec) return;

    try {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onspeechstart = null;
      rec.onspeechend = null;
      rec.onsoundstart = null;
      rec.onsoundend = null;
      rec.stop();
    } catch {
      try {
        rec.abort?.();
      } catch {}
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
  onstart?: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
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

