"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Star, Sparkles, Loader2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import styles from "./review-modal.module.css";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { rating?: number | null; comment?: string | null }) => Promise<boolean>;
  isSubmitting?: boolean;
}

const RATING_LABELS_EN = ["", "Poor", "Fair", "Good", "Very Good", "Excellent!"];
const RATING_LABELS_BN = ["", "বাজে", "মোটামুটি", "ভালো", "অনেক ভালো", "অসাধারণ!"];

export function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ReviewModalProps) {
  const { state } = useAppContext();
  const isBn = state.lang === "bn";
  const activeTheme = state?.theme?.mode === "light" ? "light" : "dark";

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment("");
    }
  }, [isOpen]);

  // Handle escape key to skip
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || rating;
  const ratingLabels = isBn ? RATING_LABELS_BN : RATING_LABELS_EN;
  const currentLabel = currentDisplayRating > 0 ? ratingLabels[currentDisplayRating] : "";

  // Submission is enabled if user provided at least a star rating OR a comment
  const hasRating = rating >= 1 && rating <= 5;
  const hasComment = comment.trim().length > 0;
  const canSubmit = (hasRating || hasComment) && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    await onSubmit({
      rating: hasRating ? rating : null,
      comment: hasComment ? comment.trim() : null,
    });
  };

  const handleStarClick = (selectedStar: number) => {
    // If clicking the already selected star, toggle/clear to 0
    if (rating === selectedStar) {
      setRating(0);
    } else {
      setRating(selectedStar);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
    >
      <div
        className={styles.modal}
        data-theme={activeTheme}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={isBn ? "বন্ধ করুন" : "Close"}
          title={isBn ? "পরে জানাবো" : "Maybe Later"}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Sparkles size={12} />
            <span>{isBn ? "ফিডব্যাক" : "FocusForge Feedback"}</span>
          </div>
          <h2 className={styles.title} id="review-title">
            {isBn ? "FocusForge-এ আপনার অভিজ্ঞতা কেমন?" : "How is your FocusForge experience?"}
          </h2>
          <p className={styles.subtitle}>
            {isBn
              ? "আপনার মূল্যবান মতামত ও পরামর্শ FocusForge-কে আরও চমৎকার ও কার্যকর করতে সাহায্য করবে।"
              : "Your honest feedback directly helps us shape future productivity features."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating (Optional) */}
          <div className={styles.ratingSection}>
            <div className={styles.starRow} role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isStarActive = currentDisplayRating >= starValue;
                return (
                  <button
                    key={starValue}
                    type="button"
                    role="radio"
                    aria-checked={rating === starValue}
                    aria-label={`${starValue} ${isBn ? "স্টার" : "Stars"}`}
                    className={`${styles.starButton} ${isStarActive ? styles.starActive : ""}`}
                    onClick={() => handleStarClick(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={isSubmitting}
                  >
                    <Star
                      size={26}
                      fill={isStarActive ? "currentColor" : "none"}
                      strokeWidth={1.8}
                    />
                  </button>
                );
              })}
            </div>
            <div className={styles.ratingLabel} aria-live="polite">
              {currentLabel}
            </div>
          </div>

          {/* Comment Box (Optional) */}
          <div className={styles.commentSection}>
            <textarea
              className={styles.textarea}
              placeholder={
                isBn
                  ? "আপনার ভালো লাগা, পরামর্শ, অভিযোগ বা নতুন ফিচারের আইডিয়া লিখুন (ঐচ্ছিক)..."
                  : "What do you like? What can we improve? Suggestions, thoughts, or complaints are all welcome (optional)..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              maxLength={1500}
              aria-label={isBn ? "আপনার মতামত লিখুন" : "Write your comment"}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.skipButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              {isBn ? "পরে জানাবো" : "Maybe Later"}
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isBn ? "জমা হচ্ছে..." : "Submitting..."}</span>
                </>
              ) : (
                <span>{isBn ? "মতামত জমা দিন" : "Submit Review"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
