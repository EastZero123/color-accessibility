# 명도대비 검사기 (Color Accessibility Analyzer)

AI 기반 WCAG 색상 대비 접근성 분석 도구입니다.

## 설치 및 실행

### 사전 준비
1. Node.js 16+ 설치
2. [Anthropic 콘솔](https://console.anthropic.com)에서 API 키 발급

### 설정
```bash
# .env 파일 생성 (.env.example 참고)
cp .env.example .env

# .env 파일에 API 키 입력
ANTHROPIC_API_KEY=your_api_key_here
```

### 실행
```bash
# 서버 + 개발 서버 동시 실행
npm start

# 또는 따로 실행
npm run server  # 터미널 1
npm run dev     # 터미널 2

# 빌드
npm run build

# 프리뷰
npm run preview
```

## 토큰 소모 최적화

✅ **구현된 최적화:**
- `max_tokens: 4096` → `2048`로 감소 (50% 절감)
- 프롬프트 단순화 (토큰 ~20% 절감)
- 순차 처리로 불필요한 API 호출 방지
- 파일 크기 제한: 10MB → 5MB
- 동시 업로드 제한: 10개 → 5개

💡 **추가 최적화 팁 (프로덕션):**
- 결과 캐싱 (Redis/DB)
- 배치 처리
- 더 작은 모델 사용 (claude-3-haiku)
- 비동기 큐 시스템

## 보안 기능

✅ **구현된 보안 기능:**

| 기능 | 설명 |
|------|------|
| **CORS 제한** | localhost:5173만 허용 |
| **Rate Limiting** | 1분당 최대 10개 요청 |
| **파일 검증** | MIME 타입 + 크기 확인 |
| **Helmet** | HTTP 보안 헤더 자동 설정 |
| **JSON 페이로드 제한** | 1MB로 제한 |
| **API 키 보안** | .env에 저장, .gitignore 추가 |
| **에러 메시지** | 민감한 정보 노출 방지 |
| **요청 로깅** | 파일명 길이 제한, 타임스탬프 기록 |

### 보안 체크리스트
- [ ] `.env` 파일은 버전 관리에서 제외됨
- [ ] `ANTHROPIC_API_KEY` 프로덕션 환경과 분리
- [ ] HTTPS 적용 (프로덕션)
- [ ] 요청 인증 추가 (필요시)
- [ ] DB 암호화 (결과 저장시)
- [ ] 입력값 추가 검증

## API 엔드포인트

### POST `/api/analyze`
이미지 파일들을 분석하고 WCAG 색상 대비 결과 반환

**요청:**
```javascript
Content-Type: multipart/form-data
Body: [images] (최대 5개, 각 5MB)
```

**응답:**
```json
{
  "results": [
    {
      "filename": "image.png",
      "imageData": "data:image/png;base64,...",
      "analysis": {
        "summary": "전체 평가",
        "overallPass": true,
        "elements": [...]
      }
    }
  ],
  "count": 1
}
```

### GET `/health`
서버 상태 체크

## 기술 스택

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Node.js + Express
- **AI:** Anthropic Claude 3.5 Sonnet
- **보안:** Helmet, CORS, Rate Limiting
- **파일 처리:** Multer

## 라이선스

MIT

