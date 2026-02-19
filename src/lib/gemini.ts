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

export interface SentenceComponent {
  segment: string;
  type: string;
  explanation: string;
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

export async function breakdownSentence(text: string): Promise<SentenceComponent[]> {
  const model = getModel();
  const prompt = `
    Analyze the following English text and break it down into *large, meaningful* chunks to improve reading comprehension. 
    The goal is to help a learner understand the flow of the sentence by grouping related words together.
    
    Rules:
    1. Do NOT split the text into single words or small tokens. Group words into complete phrases (e.g., "in the middle of the night", "despite the heavy rain").
    2. Attach punctuation (commas, periods, etc.) to the preceding segment. Do NOT create separate segments for punctuation.
    3. Break the ENTIRE text into contiguous segments. Concatenating the "segment" values must exactly reconstruct the original text.
    4. Use simple, high-level types like "Context", "Subject", "Action", "Object", "Detail", "Connector".
    
    Return the result ONLY as a JSON array of objects.
    Each object must have these exact keys: "segment", "type", "explanation".
    "segment": The text chunk (include necessary spaces).
    "type": A short high-level label.
    "explanation": A brief explanation of this chunk's role.

    Text: "${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Breakdown failed:", error);
    return [];
  }
}
