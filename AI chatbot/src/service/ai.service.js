const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({});

async function generateResponse(chatHistory) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: chatHistory,
  });
  return response.text;
}

async function generateResponseWithImage(base64Image, mimeType, userText) {
  const response = await ai.models.generateContent({
   model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: userText || "What is in this image? Describe it in detail.",
          },
        ],
      },
    ],
  });
  return response.text;
}

module.exports = { generateResponse, generateResponseWithImage };