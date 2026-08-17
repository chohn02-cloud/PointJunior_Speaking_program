import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize Google GenAI with process.env.GEMINI_API_KEY
const geminiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: geminiKey || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI PDF Script extraction endpoint
app.post("/api/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Missing pdfBase64 data." });
    }

    if (!geminiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not set on the server." });
    }

    console.log(`Processing uploaded PDF script file: ${fileName || "document.pdf"}`);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64
          }
        },
        { text: "Parse the attached English speaking dialogue booklet. Extract the title/date of the script and group the dialogues inside it. Output valid JSON adhering to the specified schema." }
      ],
      config: {
        systemInstruction: "You are an expert English speaking script processor. Your job is to read PDF speaking study booklets and cleanly extract individual monologue/dialogue structures. Identify the primary name of the script (e.g. '5/22 Script') and all dialogue arrays. Each dialogue should consist of sequential spoken lines. Return ONLY the JSON object fitting the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Name of the script unit (e.g. '5/15 Script')"
            },
            dialogues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lines: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Sequential speaking dialogue lines."
                  }
                },
                required: ["lines"]
              }
            }
          },
          required: ["name", "dialogues"]
        }
      }
    });

    const outputText = response.text || "{}";
    const data = JSON.parse(outputText);
    res.json(data);
  } catch (err: any) {
    console.error("Error extraction speech from PDF:", err);
    res.status(500).json({ error: err.message || "Gemini script extraction failed." });
  }
});

// AI Pronunciation analysis endpoint
app.post("/api/analyze-pronunciation", async (req, res) => {
  try {
    const { target, spoken } = req.body;
    if (!target) {
      return res.status(400).json({ error: "Missing target sentence." });
    }

    if (!geminiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not set on the server." });
    }

    console.log(`Analyzing pronunciation for target: "${target}" | spoken: "${spoken}"`);

    const prompt = `당신은 Point Junior Academy 중학생 전담 친절한 채빈쌤, 다혜쌤 1:1 발음 코치입니다.
학생이 마이크로 말한 발음 결과가 입력되었습니다.

- 목표 영어 문장: "${target}"
- 실제 학생 발음(STT): "${spoken}"

중학교 학생 눈높이에 맞게, 학생의 발음에서 어떤 음소나 억양이 부족하거나 변형되었는지 2~3줄로 매우 친절하고 격려 넘치는 한국어로 진단해주세요. (어려운 영어 학술 용어는 사용하지 마세요)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: prompt }]
    });

    const feedbackText = response.text || "의견을 가져올 수 없었습니다.";
    res.json({ feedback: feedbackText });
  } catch (err: any) {
    console.error("Error analyzing pronunciation:", err);
    res.status(500).json({ error: err.message || "Gemini pronunciation analysis failed." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(distPath, 'admin.html'));
    });
    app.get('/admin.html', (req, res) => {
      res.sendFile(path.join(distPath, 'admin.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded securely on port ${PORT}`);
  });
}

startServer();
