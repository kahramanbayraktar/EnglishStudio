import { GoogleGenerativeAI } from "@google/generative-ai";

const getModel = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

export interface AnalysisResult {
  phrase: string;
  type: "phrasal_verb" | "idiom";
  meaning: string;
  example: string;
}

export async function analyzeText(text: string): Promise<AnalysisResult[]> {
  const model = getModel();
  const prompt = `
    Analyze the following English text and identify all phrasal verbs and idioms.
    Return the result ONLY as a JSON array of objects.
    Each object must have these exact keys: "phrase", "type", "meaning", "example".
    The "type" should be either "phrasal_verb" or "idiom".
    
    Text: "${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Analysis failed:", error);
    return [];
  }
}
