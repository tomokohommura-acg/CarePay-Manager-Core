
import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSalaryTrends = async (data: any) => {
  // Use ai.models.generateContent to query the model directly.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `以下の給与データから、事業所のコスト効率や職員の働き方の傾向を分析し、簡潔なアドバイスをください。データ: ${JSON.stringify(data)}`,
    config: {
      temperature: 0.7,
      // maxOutputTokens is used without thinkingBudget as thinking is not required for this simple task.
      maxOutputTokens: 500,
    }
  });
  // Access the text output via the .text property (not a method).
  return response.text;
};
