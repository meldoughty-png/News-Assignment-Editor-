import { GoogleGenAI } from "@google/genai";

export async function generateBrandImage() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A professional, high-tech brand logo for "Newsroom AI". The logo features a stylized, geometric "N" that looks like the wings of a Hummingbird in flight. The "N" is set against a circular background with concentric rings and nodes, inspired by a Trinidadian Steelpan. The color palette is a vibrant Caribbean gradient of Scarlet Ibis Red, Sunset Orange, and Deep Sea Blue. The style is sleek, modern, and digital, with a subtle glow effect. High resolution, 4k, professional graphic design.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
}
