import { useState } from 'react';
import type { AnalysisResult, ContrastElement } from '../types';

function ColorPair({ fg, bg }: { fg: string; bg: string }) {
  return (
    <div className="color-pair">
      <span className="color-swatch" style={{ background: fg }} title={fg} />
      <svg className="color-pair__arrow" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1l7 7-7 7M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
      <span className="color-swatch" style={{ background: bg }} title={bg} />
    </div>
  );
}

function ElementRow({ el }: { el: ContrastElement }) {
  const typeLabel: Record<string, string> = {
    normal_text: '일반 텍스트',
    large_text: '큰 텍스트',
    ui_component: 'UI 컴포넌트',
  };

  return (
    <div className={`element-row${el.wcagAA ? ' element-row--pass' : ' element-row--fail'}`}>
      <div className="element-row__status">
        {el.wcagAA
          ? <span className="status-dot status-dot--pass" aria-label="통과" />
          : <span className="status-dot status-dot--fail" aria-label="실패" />}
      </div>
      <ColorPair fg={el.foregroundColor} bg={el.backgroundColor} />
      <div className="element-row__info">
        <span className="element-row__desc">{el.description}</span>
        <span className="element-row__location">{el.location}</span>
      </div>
      <div className="element-row__meta">
        <span className="element-row__type">{typeLabel[el.type] ?? el.type}</span>
        <span className="element-row__ratio">{el.contrastRatio.toFixed(2)}:1</span>
      </div>
      <div className="element-row__badges">
        <span className={`wcag-badge${el.wcagAA ? ' wcag-badge--pass' : ' wcag-badge--fail'}`}>AA</span>
        <span className={`wcag-badge${el.wcagAAA ? ' wcag-badge--pass' : ' wcag-badge--fail'}`}>AAA</span>
      </div>
    </div>
  );
}

export function ImageCard({ result, onImageClick }: { result: AnalysisResult; onImageClick?: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const { filename, imageData, analysis } = result;

  // analysis가 없으면 분석 중 상태
  const isAnalyzing = !analysis;
  const passCount = analysis?.elements.filter((e) => e.wcagAA).length ?? 0;
  const failCount = analysis?.elements.filter((e) => !e.wcagAA).length ?? 0;

  return (
    <article className={`image-card${analysis?.overallPass ? ' image-card--pass' : analysis ? ' image-card--fail' : ' image-card--analyzing'}`}>
      <div className="image-card__header">
        <div
          className="image-card__thumb-wrap"
          onClick={onImageClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onImageClick?.()}
          aria-label="이미지 확대 보기"
        >
          <img src={imageData} alt={filename} className="image-card__thumb" />
        </div>
        <div className="image-card__overview">
          <div className="image-card__title-row">
            <h3 className="image-card__filename">{filename}</h3>
            {isAnalyzing && (
              <span className="overall-pill overall-pill--analyzing">
                분석 중...
              </span>
            )}
            {!isAnalyzing && (
              <span className={`overall-pill${analysis.overallPass ? ' overall-pill--pass' : ' overall-pill--fail'}`}>
                {analysis.overallPass ? '✓ WCAG AA 통과' : '✗ WCAG AA 미충족'}
              </span>
            )}
          </div>
          {!isAnalyzing && (
            <>
              <p className="image-card__summary">{analysis.summary}</p>
              <div className="image-card__stats">
                <span className="stat-chip stat-chip--pass">통과 {passCount}개</span>
                <span className="stat-chip stat-chip--fail">실패 {failCount}개</span>
                <span className="stat-chip">전체 {analysis.elements.length}개</span>
              </div>
            </>
          )}
          {isAnalyzing && (
            <div className="image-card__analyzing">
              <div className="mini-spinner" />
              <span>분석 결과를 기다리는 중입니다...</span>
            </div>
          )}
        </div>
      </div>

      {!isAnalyzing && analysis.elements.length > 0 && (
        <>
          <button
            className="elements-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span>감지된 요소 ({analysis.elements.length}개)</span>
            <svg
              className={`toggle-icon${expanded ? ' toggle-icon--open' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {expanded && (
            <div className="elements-list">
              {analysis.elements.map((el) => (
                <ElementRow key={el.id} el={el} />
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}
