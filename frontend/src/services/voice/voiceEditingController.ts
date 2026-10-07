/**
 * voiceEditingController.ts — Foscentia Voice Editing & Cursor Controller
 *
 * Canonical editor document = prefix + committedVoice + interimVoice + suffix.
 * The controller never owns a second transcript display. It only describes
 * how voice deltas are inserted into the real editor value.
 */

export interface VoiceEditAnchor {
  prefix: string;
  suffix: string;
  insertionStart: number;
  committedVoice: string;
  documentVersion: number;
}

export class VoiceEditingController {
  private anchor: VoiceEditAnchor | null = null;
  private currentDocumentText: string = "";
  private documentVersion: number = 0;

  public createAnchor(
    documentText: string,
    selectionStart?: number,
    selectionEnd?: number
  ): VoiceEditAnchor {
    this.currentDocumentText = documentText || "";
    this.documentVersion++;

    const len = this.currentDocumentText.length;
    const start =
      typeof selectionStart === "number" && selectionStart >= 0
        ? Math.min(selectionStart, len)
        : len;
    const end =
      typeof selectionEnd === "number" && selectionEnd >= 0
        ? Math.min(selectionEnd, len)
        : start;

    const prefix = this.currentDocumentText.slice(0, start);
    const suffix = this.currentDocumentText.slice(end);

    this.anchor = {
      prefix,
      suffix,
      insertionStart: prefix.length,
      committedVoice: "",
      documentVersion: this.documentVersion,
    };

    return this.anchor;
  }

  public getCurrentDocumentText(): string {
    return this.currentDocumentText;
  }

  /**
   * User typed, deleted, pasted, or moved the caret. The document already
   * contains previously committed voice, so committedVoice resets.
   */
  public onManualDocumentChange(
    newDocumentText: string,
    newSelectionStart?: number,
    newSelectionEnd?: number
  ) {
    this.createAnchor(newDocumentText, newSelectionStart, newSelectionEnd);
  }

  /**
   * Commits a finalized voice *delta* (not the whole session transcript).
   */
  public applyFinalChunk(newChunk: string): {
    previewText: string;
    previewCaretPosition: number;
  } {
    if (!this.anchor) {
      this.createAnchor(this.currentDocumentText);
    }

    const cleanChunk = (newChunk || "").trim();
    if (cleanChunk) {
      const prev = this.anchor!.committedVoice;
      const needsSpace =
        prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
      this.anchor!.committedVoice = `${prev}${needsSpace ? " " : ""}${cleanChunk}`;
    }

    return this.getInterimPreview("");
  }

  /**
   * Preview: prefix + committed voice + current interim + suffix.
   * Does not mutate committedVoice.
   */
  public getInterimPreview(interimVoice: string): {
    previewText: string;
    previewCaretPosition: number;
  } {
    if (!this.anchor) {
      const live = (interimVoice || "").trim();
      return {
        previewText: live,
        previewCaretPosition: live.length,
      };
    }

    const { prefix, suffix, committedVoice } = this.anchor;
    const finalClean = committedVoice || "";
    const interimClean = (interimVoice || "").trim();

    let combinedVoice = finalClean.trim();
    if (interimClean) {
      const needsSpace =
        combinedVoice.length > 0 &&
        !combinedVoice.endsWith(" ") &&
        !combinedVoice.endsWith("\n");
      combinedVoice += (needsSpace ? " " : "") + interimClean;
    }

    if (!combinedVoice) {
      return {
        previewText: `${prefix}${suffix}`,
        previewCaretPosition: prefix.length,
      };
    }

    let leadSpace = "";
    if (
      prefix.length > 0 &&
      !prefix.endsWith(" ") &&
      !prefix.endsWith("\n")
    ) {
      leadSpace = " ";
    }

    let trailSpace = "";
    if (
      suffix.length > 0 &&
      !suffix.startsWith(" ") &&
      !suffix.startsWith("\n")
    ) {
      trailSpace = " ";
    }

    const previewText = `${prefix}${leadSpace}${combinedVoice}${trailSpace}${suffix}`;
    const previewCaretPosition =
      prefix.length + leadSpace.length + combinedVoice.length;

    this.currentDocumentText = previewText;

    return {
      previewText,
      previewCaretPosition,
    };
  }

  public reset() {
    this.anchor = null;
    this.currentDocumentText = "";
    this.documentVersion = 0;
  }
}
