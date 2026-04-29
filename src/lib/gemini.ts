import { GoogleGenAI, Type } from "@google/genai";
import { MCQ } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseQuizFromPDF(base64Data: string): Promise<MCQ[]> {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
        {
          text: "Extract all Multiple Choice Questions (MCQs) and their correct answers from this PDF. For each MCQ, provide the question text, a list of exactly 4 options, the string value of the correct answer, and an explanation for why the wrong answers are incorrect. Ensure the correct answer matches one of the options exactly. Return the data as a JSON array.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 4 options."
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  try {
    const text = result.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as MCQ[];
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Could not extract quiz from PDF. Please ensure the PDF contains MCQs and answers.");
  }
}
