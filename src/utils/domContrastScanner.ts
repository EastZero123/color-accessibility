/**
 * DOM 기반 명도대비 검수 스크립트 (사용자가 요청한 3가지 요구사항 반영)
 *
 * 1. 비텍스트 UI 요소 검수 제외: 텍스트가 없는 순수 UI 요소 제외 (innerText / textContent 확인)
 * 2. 색상 인식 오류 수정: getComputedStyle 사용, 부모 요소의 배경색(transparent 상속) 추적 결합
 * 3. 폰트 크기에 따른 동적 검수 기준: 14px 미만은 4.5:1, 14px 이상은 3.0:1 적용
 */

import { getContrastRatio, rgbToHex } from './colorUtils';

// RGBA 문자열에서 색상값을 추출하는 헬퍼 함수
function parseRgb(colorStr: string) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10)
  };
}

// 2. 부모로 거슬러 올라가며 실제 배경색(transparent 제외)을 찾는 함수
export function getActualBackgroundColor(el: HTMLElement): string {
  let currentEl: HTMLElement | null = el;
  while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
    const style = window.getComputedStyle(currentEl);
    const bgColor = style.backgroundColor;

    // 투명도(rgba)가 0인 경우(transparent)거나 스타일이 명확하지 않은 경우 부모로 올라감
    if (bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      const rgb = parseRgb(bgColor);
      if (rgb) {
        return rgbToHex(rgb);
      }
    }
    currentEl = currentEl.parentElement;
  }
  return '#ffffff'; // 끝까지 올라가도 없을 경우 기본 흰색 반환
}

export function scanDomForContrast() {
  const elements = document.body.querySelectorAll('*');
  const issues = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;

    // 1. 비텍스트 UI 요소 검수 제외 (자식 요소 없이 순수 텍스트를 가지는지 확인)
    // 혹은 textContent가 실제로 존재하는지 확인하여 빈 요소나 순수 아이콘/구분선 배제
    const text = el.innerText || el.textContent;
    if (!text || text.trim() === '') {
      continue; // 텍스트가 없으면 제외
    }

    // 자식 요소들이 모두 텍스트를 포함하는 블록 요소라면 자식에서 검수되도록 본문 통과 검사는 필요하지만, 깊은 단위로 가기 위함.
    // 여기서는 가장 마지막 깊이의 텍스트 노드를 포함하는 요소만 추출하기 위한 간단한 필터링.
    if (el.children.length > 0 && Array.from(el.children).some(child => child.textContent?.trim() !== '')) {
      continue; // 자신보다 하위에 텍스트가 있는 자식이 있으면 부모는 중복검사 하지 않음
    }

    const style = window.getComputedStyle(el);
    const fgRgb = parseRgb(style.color);
    if (!fgRgb) continue;

    const fgHex = rgbToHex(fgRgb);
    const bgHex = getActualBackgroundColor(el); // 상속값을 정확히 반영한 배경색

    const ratio = getContrastRatio(fgHex, bgHex);

    // 3. 폰트 크기에 따른 동적 검수 기준 (Threshold)
    const fontSizePx = parseFloat(style.fontSize) || 16;
    const requiredRatio = fontSizePx < 14 ? 4.5 : 3.0;

    const passed = ratio >= requiredRatio;

    if (!passed) {
      issues.push({
        element: el,
        text: text.trim().substring(0, 30),
        fontSize: Math.round(fontSizePx) + 'px',
        fgHex,
        bgHex,
        ratio: ratio.toFixed(2) + ':1',
        requiredRatio: requiredRatio + ':1'
      });
    }
  }

  return issues;
}

