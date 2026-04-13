import { useEffect, useState } from 'react';
import type { AnalysisResult } from '../types';

// 명도 계산 유틸리티 함수들
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

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
  const [fgColor, setFgColor] = useState<string>('');
  const [bgColor, setBgColor] = useState<string>('');

  const pickColor = async (setColor: (color: string) => void) => {
    if (!('EyeDropper' in window)) {
      alert('스포이드 기능이 지원되지 않는 브라우저입니다.');
      return;
    }
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      setColor(result.sRGBHex);
    } catch (e) {
      console.log('색상 선택 취소됨');
    }
  };

  const manualContrast = (fgColor && bgColor) ? getContrastRatio(fgColor, bgColor).toFixed(2) : null;

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

  if (!isOpen) {
    if (fgColor) setFgColor('');
    if (bgColor) setBgColor('');
    return null;
  }

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

          <div className="manual-check">
            <h3>수동 명암비 검수</h3>
            <div className="color-pickers">
              <div className="picker-group">
                <span className="color-swatch" style={{ backgroundColor: fgColor || 'transparent' }}></span>
                <button type="button" onClick={() => pickColor(setFgColor)}>전경색 스포이드</button>
                <span>{fgColor || '선택 안됨'}</span>
              </div>
              <div className="picker-group">
                <span className="color-swatch" style={{ backgroundColor: bgColor || 'transparent' }}></span>
                <button type="button" onClick={() => pickColor(setBgColor)}>배경색 스포이드</button>
                <span>{bgColor || '선택 안됨'}</span>
              </div>
            </div>
            {manualContrast && (
              <p className="manual-result">
                계산된 명암비: <strong>{manualContrast} : 1</strong>
                ({Number(manualContrast) >= 4.5 ? 'AA 통과' : Number(manualContrast) >= 3 ? 'Large 텍스트 통과' : '미충족'})
              </p>
            )}
          </div>
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
