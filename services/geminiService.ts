import { GoogleGenAI } from "@google/genai";
import { PDFPage } from "../types";

// Helper to strip the data:image/jpeg;base64, prefix
const cleanBase64 = (dataUrl: string) => {
  if (dataUrl.includes(',')) {
      return dataUrl.split(',')[1];
  }
  return dataUrl;
};

export const generateModifiedPage = async (page: PDFPage): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct a prompt based on all rectangles
  let promptText = "Edit this document page image. Maintain the original layout and style as much as possible. ";
  
  // The first part is the prompt
  // The second part is the Main Image (PDF Page)
  // Subsequent parts are reference images, if any.
  
  const parts: any[] = [];
  
  if (page.rects.length === 0) {
    return page.originalBase64; // No changes needed
  }

  // We need to keep track of how many reference images we have added to the parts array
  // so we can refer to them by index in the text prompt.
  // Note: Gemini understands sequence. We will append reference images after the main image.
  let refImageCount = 0;

  page.rects.forEach((rect, idx) => {
    // Describe location for the model
    const locationDesc = `Region ${idx + 1} (approximate location: x=${Math.round(rect.x)}%, y=${Math.round(rect.y)}%, width=${Math.round(rect.w)}%, height=${Math.round(rect.h)}%)`;
    
    let instruction = `\n- In ${locationDesc}: ${rect.prompt}`;
    
    if (rect.referenceImage) {
        refImageCount++;
        instruction += ` Use "Reference Image ${refImageCount}" provided below as visual reference for this change.`;
    }
    
    promptText += instruction;
  });

  promptText += "\n\nI have provided the main page image first. Any subsequent images are the reference images mentioned above. Output the full modified page image.";

  // Part 1: Text Prompt
  parts.push({ text: promptText });

  // Part 2: Main PDF Page Image
  parts.push({
    inlineData: {
      mimeType: 'image/jpeg', // Assuming converted canvas is jpeg
      data: cleanBase64(page.originalBase64),
    },
  });

  // Part 3...N: Reference Images
  page.rects.forEach((rect) => {
      if (rect.referenceImage) {
          parts.push({
              inlineData: {
                  mimeType: 'image/png', // Assume png/jpeg, API handles generic image types well
                  data: cleanBase64(rect.referenceImage),
              }
          });
      }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Nano Banana Pro
      contents: {
        parts: parts,
      },
    });

    // Extract image from response
    // Gemini usually returns the image as the first part or within parts
    const resParts = response.candidates?.[0]?.content?.parts;
    if (resParts) {
      for (const part of resParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated in response");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};