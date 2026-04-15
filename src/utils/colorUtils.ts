export function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function srgbToLinear(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function getLuminance(r: number, g: number, b: number) {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function getContrastRatio(hex1: string, hex2: string) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// HSL 및 RGB 변환 유틸리티 (색상을 유지하면서 명도만 조절하기 위해)
export function rgbToHsl(r: number, g: number, b: number) {
  const r_norm = r / 255;
  const g_norm = g / 255;
  const b_norm = b / 255;

  const max = Math.max(r_norm, g_norm, b_norm);
  const min = Math.min(r_norm, g_norm, b_norm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
      case g_norm: h = (b_norm - r_norm) / d + 2; break;
      case b_norm: h = (r_norm - g_norm) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function recommendColor(fgHex: string, bgHex: string, targetRatio: number): string | null {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);

  if (!fgRgb || !bgRgb) return null;

  const { h, s, l: originL } = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);

  // 현재 명암비가 이미 채운 상태라면 그대로 반환
  if (getContrastRatio(fgHex, bgHex) >= targetRatio) return fgHex;

  // L을 0부터 1까지 아주 작게 증가시키며 최소 거리(색공간 등에서)의 색상을 찾는다. 가장 가까운 L을 찾아도 됨.
  // 1. 방향 설정 (더 어둡게 혹은 더 밝게)
  // 그러나 배경의 휘도에 따라 위/아래 다 가능하므로 0부터 100(%)까지 시뮬레이션
  let bestColor: { r: number; g: number; b: number } | null = null;
  let bestLDiff = 1; // 가장 원본 L값과 가까울 수록 좋음

  for (let l = 0; l <= 100; l += 1) {
    const testL = l / 100;
    const testRgb = hslToRgb(h, s, testL);
    const testHex = rgbToHex(testRgb);

    const ratio = getContrastRatio(testHex, bgHex);
    if (ratio >= targetRatio) {
      const lDiff = Math.abs(testL - originL);
      if (lDiff < bestLDiff) {
        bestLDiff = lDiff;
        bestColor = testRgb;
      }
    }
  }

  return bestColor ? rgbToHex(bestColor) : null;
}

