import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import helmet from 'helmet';

config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('오류: ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const MEDIA_TYPE_MAP = {
  'image/jpg': 'image/jpeg',
};

// 간단한 메모리 기반 Rate Limiter (프로덕션에서는 Redis 사용 권장)
const requestLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 10; // 1분에 최대 10개 요청

function checkRateLimit(clientIp) {
  const now = Date.now();
  if (!requestLimiter.has(clientIp)) {
    requestLimiter.set(clientIp, []);
  }

  const requests = requestLimiter.get(clientIp);
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  requestLimiter.set(clientIp, recentRequests);
  return true;
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 10MB → 5MB로 축소
  fileFilter: (_req, file, cb) => {
    // 파일 크기 검증
    if (file.size < 10 * 1024) { // 최소 10KB
      cb(new Error('이미지가 너무 작습니다. 최소 10KB 이상이어야 합니다.'));
      return;
    }

    const normalized = MEDIA_TYPE_MAP[file.mimetype] ?? file.mimetype;
    if (SUPPORTED_MEDIA_TYPES.has(normalized)) cb(null, true);
    else cb(new Error('지원하지 않는 이미지 형식입니다.'));
  },
});

// CORS 설정 - 보안 강화
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  maxAge: 86400, // 24시간
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Helmet 보안 헤더 추가
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
    },
  },
}));

app.use(express.json({ limit: '1mb' })); // JSON 페이로드 크기 제한

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 최적화된 프롬프트 (토큰 소모 감소)
const ANALYZE_PROMPT = `분석해야 할 핵심 정보만 JSON으로 반환하세요:
{
  "summary": "한국어 평가",
  "overallPass": boolean,
  "elements": [
    {
      "id": number,
      "description": "요소 설명",
      "type": "normal_text"|"large_text"|"ui_component",
      "foregroundColor": "#HEX",
      "backgroundColor": "#HEX",
      "contrastRatio": number,
      "wcagAA": boolean,
      "wcagAAA": boolean,
      "location": "위치"
    }
  ]
}`;

// Rate Limiter 미들웨어
app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }
  next();
});

app.post('/api/analyze', upload.array('images', 5), async (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: '이미지를 업로드해주세요.' });
  }

  // 안전한 로깅 (민감한 정보 제외)
  console.log(`[${new Date().toISOString()}] 분석 요청: ${files.length}개 이미지`);

  try {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff'); // XSS 방지

    // 순차 처리로 토큰 사용량 제어 (병렬 처리는 비용 증가)
    const results = [];

    for (const file of files) {
      try {
        const base64Image = file.buffer.toString('base64');
        const mediaType = MEDIA_TYPE_MAP[file.mimetype] ?? file.mimetype;

        console.log(`[${new Date().toISOString()}] 분석 시작: ${file.originalname.slice(0, 50)}`);

        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048, // 4096 → 2048로 감소 (토큰 50% 절감)
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64Image },
                },
                { type: 'text', text: ANALYZE_PROMPT },
              ],
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('응답 형식 오류');
        }

        let analysis;
        try {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content.text);

          // 응답 검증
          if (!analysis.summary || analysis.overallPass === undefined || !Array.isArray(analysis.elements)) {
            throw new Error('응답 구조 오류');
          }
        } catch (parseError) {
          console.warn(`파싱 실패: ${file.originalname.slice(0, 50)}`);
          throw new Error('분석 결과 처리 오류');
        }

        results.push({
          filename: file.originalname.slice(0, 255), // 파일명 길이 제한
          imageData: `data:${mediaType};base64,${base64Image}`,
          analysis,
        });

        console.log(`[${new Date().toISOString()}] 분석 완료: ${file.originalname.slice(0, 50)}`);
      } catch (error) {
        console.warn(`이미지 처리 실패: ${file.originalname.slice(0, 50)}`);
        // 실패한 이미지는 건너뛰고 계속 진행
      }
    }

    if (results.length === 0) {
      return res.status(500).json({ error: '분석에 실패했습니다. 다시 시도해주세요.' });
    }

    res.json({ results, count: results.length });
  } catch (error) {
    console.error('[ERROR]', error instanceof Error ? error.message : '알 수 없는 오류');
    // 에러 메시지에 민감한 정보 노출 방지
    const statusCode = error?.status === 429 ? 429 : 500;
    res.status(statusCode).json({ error: '서비스 처리 중 오류가 발생했습니다.' });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] 서버 실행: http://localhost:${PORT}`);
});
