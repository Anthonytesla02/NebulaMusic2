import { GoogleGenAI, Type } from "@google/genai";

// Analyze track metadata to generate mood, color, and description
export const analyzeTrackVibe = async (title: string, artist: string): Promise<{ mood: string; color: string; description: string }> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key missing, returning default vibe.");
      return getFallbackVibe();
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the song "${title}" by "${artist}". Provide a visual theme color (hex), a one-word mood, and a short, poetic 1-sentence description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            color: { type: Type.STRING, description: "A hex color code representing the song's vibe." },
            description: { type: Type.STRING }
          },
          required: ["mood", "color", "description"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return getFallbackVibe();
  }
};

const getFallbackVibe = () => ({
  mood: "Unknown",
  color: "#6366f1", // Indigo-500 default
  description: "A mystery track waiting to be heard."
});