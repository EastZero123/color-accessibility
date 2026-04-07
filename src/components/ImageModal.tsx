import { useEffect } from 'react';
import type { AnalysisResult } from '../types';

interface ImageModalProps {
  result: AnalysisResult;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function ImageModal({
  result,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ImageModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!isOpen) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="image-modal__close"
          onClick={onClose}
          aria-label="닫기"
          title="닫기 (ESC)"
        >
          ✕
        </button>

        <div className="image-modal__content">
          <img
            src={result.imageData}
            alt={result.filename}
            className="image-modal__image"
          />
        </div>

        <div className="image-modal__info">
          <h2 className="image-modal__filename">{result.filename}</h2>
          {result.analysis && (
            <p className="image-modal__status">
              {result.analysis.overallPass ? '✓ WCAG AA 통과' : '✗ WCAG AA 미충족'}
            </p>
          )}
        </div>

        {(hasPrevious || hasNext) && (
          <div className="image-modal__nav">
            {hasPrevious && (
              <button
                className="image-modal__nav-btn image-modal__nav-btn--prev"
                onClick={onPrevious}
                aria-label="이전 이미지"
                title="이전 이미지 (←)"
              >
                ‹
              </button>
            )}
            {hasNext && (
              <button
                className="image-modal__nav-btn image-modal__nav-btn--next"
                onClick={onNext}
                aria-label="다음 이미지"
                title="다음 이미지 (→)"
              >
                ›
              </button>
            )}
          </div>
        )}

        <div className="image-modal__keyboard-hint">
          ESC: 닫기 {hasPrevious && '← : 이전'} {hasNext && '→ : 다음'}
        </div>
      </div>
    </div>
  );
}

