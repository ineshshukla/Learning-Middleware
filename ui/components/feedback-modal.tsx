"use client";

import { useState } from "react";
import { X, Star, Loader2 } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedbackText: string) => Promise<void>;
  onSkip: () => void;
  title: string;
  subtitle?: string;
  isSubmitting?: boolean;
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  onSkip,
  title,
  subtitle,
  isSubmitting = false
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>("");

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating before submitting");
      return;
    }
    await onSubmit(rating, feedbackText);
  };

  const handleSkip = () => {
    setRating(0);
    setFeedbackText("");
    onSkip();
  };

  const handleClose = () => {
    setRating(0);
    setFeedbackText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-900 mb-2">{title}</h2>
          {subtitle && <p className="text-sm text-gray-900 dark:text-gray-900">{subtitle}</p>}
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              disabled={isSubmitting}
              className="p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed"
            >
              <Star
                className={`h-10 w-10 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-[#ff9f6b] text-[#ff9f6b]"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Text */}
        {rating > 0 && (
          <p className="text-center text-sm text-gray-900 dark:text-gray-900 mb-4">
            You rated: {rating} {rating === 1 ? "star" : "stars"}
          </p>
        )}

        {/* Feedback Text Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-900 mb-2">
            Additional feedback (optional)
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            disabled={isSubmitting}
            placeholder="Tell us more about your experience..."
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff9f6b] focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-900 placeholder:text-gray-400"
            maxLength={2000}
          />
          <p className="text-xs text-gray-700 dark:text-gray-700 mt-1">
            {feedbackText.length}/2000 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-white dark:bg-white border border-gray-300 text-gray-900 dark:text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ffc09f] to-[#ff9f6b] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-700 dark:text-gray-700 text-center mt-4">
          Your feedback helps us improve the learning experience
        </p>
      </div>
    </div>
  );
}
