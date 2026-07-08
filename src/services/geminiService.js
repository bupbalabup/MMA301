const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_INSTRUCTION = `
You are an expert Vietnamese interior design consultant.

Your role is to analyze bedroom photos and provide practical, actionable renovation advice.

You always respond in Vietnamese.

You always respond in valid JSON format.
Do not include markdown, code fences, or any text outside the JSON object.

If the image is not a photo of a room or indoor space, respond with:
{"success": false, "message": "Hình ảnh không phải là một căn phòng. Vui lòng chụp lại."}

If the image is too dark, blurry, or unclear to analyze, respond with:
{"success": false, "message": "Hình ảnh không rõ ràng. Vui lòng chụp lại với ánh sáng tốt hơn."}
`;

const OUTPUT_FORMAT_INSTRUCTION = `
Respond ONLY with a JSON object in this exact format:
{
  "success": true,
  "analysis": {
    "currentStyle": "string - tên phong cách hiện tại",
    "recommendedStyle": "string - phong cách đề xuất",
    "summary": "string - 2-3 câu tóm tắt",
    "roomScore": {
      "overall": "number 0-100",
      "lighting": "number 0-100",
      "layout": "number 0-100",
      "color": "number 0-100",
      "decoration": "number 0-100",
      "storage": "number 0-100"
    }
  },
  "recommendations": [
    {
      "title": "string - hành động ngắn gọn",
      "description": "string - 1-2 câu giải thích tại sao",
      "category": "paint | lighting | decor | furniture | storage | layout",
      "priority": "high | medium | low"
    }
  ],
  "products": [
    {
      "title": "string - tên sản phẩm thật",
      "price": "string - giá bằng số VND, ví dụ '450000'",
      "website": "string - ví dụ 'Shopee', 'IKEA', 'Lazada'",
      "reason": "string - tại sao sản phẩm này phù hợp"
    }
  ]
}

Rules:
- recommendations: 3 to 6 items. Ordered by priority (high first).
- products: 3 to 5 items. Prioritize products available in Vietnam.
- All scores are integers between 0 and 100.
- price must be a numeric string in VND, for example "450000".
- Do not add any fields not listed above.
- Do not omit any fields listed above.
- If a field has no value, use empty string "".
- Do not wrap the JSON in markdown code fences.
`;

const SCORE_KEYS = [
  'overall',
  'lighting',
  'layout',
  'color',
  'decoration',
  'storage',
];

const RECOMMENDATION_KEYS = ['title', 'description', 'category', 'priority'];
const PRODUCT_KEYS = ['title', 'price', 'website', 'reason'];
const VALID_CATEGORIES = ['paint', 'lighting', 'decor', 'furniture', 'storage', 'layout'];
const VALID_PRIORITIES = ['high', 'medium', 'low'];

function getPersonalizationValue(personalization, key, fallback) {
  return personalization?.[key] || fallback;
}

function getKeepItems(personalization) {
  if (!personalization?.keepItems?.length) {
    return 'Không có yêu cầu cụ thể';
  }

  return personalization.keepItems.join(', ');
}

function buildConsultantPrompt() {
  return `
Phân tích căn phòng ngủ trong ảnh.

Hãy thực hiện:
1. Nhận diện phong cách nội thất hiện tại.
2. Chấm điểm căn phòng theo 6 tiêu chí (0-100): overall, lighting, layout, color, decoration, storage.
3. Viết tóm tắt 2-3 câu về ưu và nhược điểm.
4. Đưa ra 3-6 đề xuất cải thiện cụ thể, sắp xếp theo mức độ ưu tiên.
5. Gợi ý 3-5 sản phẩm thật có bán tại Việt Nam (Shopee, Lazada, IKEA hoặc tương tự).

Với mode này, recommendedStyle nên là phong cách phù hợp nhất mà AI tự đề xuất.

${OUTPUT_FORMAT_INSTRUCTION}
`;
}

function buildRenovationPrompt(style, personalization) {
  const budget = getPersonalizationValue(personalization, 'budget', 'Không giới hạn');
  const changeLevel = getPersonalizationValue(personalization, 'changeLevel', '50%');
  const notes = getPersonalizationValue(personalization, 'notes', 'Không có');

  return `
Phân tích căn phòng ngủ trong ảnh và đề xuất cải tạo theo phong cách "${style}".

Ràng buộc:
- Giữ nguyên bố cục phòng (tường, cửa, cửa sổ không thay đổi).
- Ngân sách: ${budget}.
- Mức thay đổi: ${changeLevel}.
- Những món muốn giữ lại: ${getKeepItems(personalization)}.
- Ghi chú thêm: ${notes}.

Hãy thực hiện:
1. Nhận diện phong cách hiện tại và xác nhận phong cách mục tiêu là "${style}".
2. Chấm điểm căn phòng hiện tại theo 6 tiêu chí.
3. Viết tóm tắt 2-3 câu về những gì nên giữ và những gì nên thay đổi.
4. Đưa ra 3-6 bước cải tạo cụ thể, sắp xếp theo mức độ ưu tiên.
5. Gợi ý 3-5 sản phẩm thật có bán tại Việt Nam phù hợp với phong cách "${style}".

${OUTPUT_FORMAT_INSTRUCTION}
`;
}

function buildDesignPrompt(style, personalization) {
  const budget = getPersonalizationValue(personalization, 'budget', 'Không giới hạn');
  const notes = getPersonalizationValue(personalization, 'notes', 'Không có');

  return `
Phân tích căn phòng ngủ trong ảnh và đề xuất thiết kế lại hoàn toàn theo phong cách "${style}".

Bạn KHÔNG bị giới hạn bởi bố cục hiện tại.
Bạn có thể đề xuất thay đổi mọi thứ: nội thất, màu sắc, ánh sáng, bố cục, lưu trữ.
Hãy sáng tạo và táo bạo.

Ngân sách: ${budget}.
Ghi chú thêm: ${notes}.

Hãy thực hiện:
1. Nhận diện phong cách hiện tại và đề xuất chuyển sang "${style}".
2. Chấm điểm căn phòng hiện tại theo 6 tiêu chí.
3. Viết tóm tắt 2-3 câu mô tả tầm nhìn thiết kế mới.
4. Đưa ra 3-6 đề xuất thiết kế táo bạo, sắp xếp theo mức độ ưu tiên.
5. Gợi ý 3-5 sản phẩm thật có bán tại Việt Nam phù hợp với phong cách "${style}".

${OUTPUT_FORMAT_INSTRUCTION}
`;
}

function buildPrompt(mode, style, personalization) {
  if (mode === 'consultant') {
    return buildConsultantPrompt();
  }

  if (mode === 'renovation') {
    return buildRenovationPrompt(style, personalization);
  }

  if (mode === 'design') {
    return buildDesignPrompt(style, personalization);
  }

  throw new Error('Invalid AI mode.');
}

function getImageData(imageBase64) {
  if (!imageBase64.includes(',')) {
    return imageBase64;
  }

  return imageBase64.split(',')[1];
}

async function callGeminiApi(imageBase64, prompt) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: getImageData(imageBase64),
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Gemini API request failed.');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini response is empty.');
  }

  return JSON.parse(text);
}

function hasOnlyKeys(object, keys) {
  const objectKeys = Object.keys(object);

  return objectKeys.length === keys.length && objectKeys.every((key) => keys.includes(key));
}

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function validateRoomScore(roomScore) {
  if (!roomScore || typeof roomScore !== 'object') {
    return false;
  }

  return hasOnlyKeys(roomScore, SCORE_KEYS)
    && SCORE_KEYS.every((key) => isScore(roomScore[key]));
}

function validateRecommendation(recommendation) {
  return recommendation
    && typeof recommendation === 'object'
    && hasOnlyKeys(recommendation, RECOMMENDATION_KEYS)
    && typeof recommendation.title === 'string'
    && typeof recommendation.description === 'string'
    && VALID_CATEGORIES.includes(recommendation.category)
    && VALID_PRIORITIES.includes(recommendation.priority);
}

function validateProduct(product) {
  return product
    && typeof product === 'object'
    && hasOnlyKeys(product, PRODUCT_KEYS)
    && PRODUCT_KEYS.every((key) => typeof product[key] === 'string')
    && (product.price === '' || Number.isInteger(Number(product.price)));
}

function validateSuccessResponse(result) {
  if (!hasOnlyKeys(result, ['success', 'analysis', 'recommendations', 'products'])) {
    return false;
  }

  const { analysis, recommendations, products } = result;

  return analysis
    && typeof analysis === 'object'
    && hasOnlyKeys(analysis, ['currentStyle', 'recommendedStyle', 'summary', 'roomScore'])
    && typeof analysis.currentStyle === 'string'
    && typeof analysis.recommendedStyle === 'string'
    && typeof analysis.summary === 'string'
    && validateRoomScore(analysis.roomScore)
    && Array.isArray(recommendations)
    && recommendations.length >= 3
    && recommendations.length <= 6
    && recommendations.every(validateRecommendation)
    && Array.isArray(products)
    && products.length >= 3
    && products.length <= 5
    && products.every(validateProduct);
}

function validateErrorResponse(result) {
  return hasOnlyKeys(result, ['success', 'message'])
    && result.success === false
    && typeof result.message === 'string';
}

function validateResponse(result) {
  if (!result || typeof result !== 'object' || typeof result.success !== 'boolean') {
    return false;
  }

  if (result.success === false) {
    return validateErrorResponse(result);
  }

  return validateSuccessResponse(result);
}

async function requestAnalysis(imageBase64, prompt) {
  const result = await callGeminiApi(imageBase64, prompt);

  if (!validateResponse(result)) {
    throw new Error('Invalid Gemini response schema.');
  }

  return result;
}

export async function analyzeRoom(imageBase64, mode, style, personalization) {
  const prompt = buildPrompt(mode, style, personalization);

  try {
    return await requestAnalysis(imageBase64, prompt);
  } catch (error) {
    try {
      return await requestAnalysis(imageBase64, prompt);
    } catch (retryError) {
      throw new Error('Không thể phân tích căn phòng. Vui lòng thử lại.');
    }
  }
}
