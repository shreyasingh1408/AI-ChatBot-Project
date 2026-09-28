const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Retry helper
async function generateWithRetry(request, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Gemini request - attempt ${attempt}/${maxRetries}`);

      const response = await ai.models.generateContent(request);

      console.log("Gemini response received successfully.");

      return response;

    } catch (error) {
      console.error(
        `Gemini attempt ${attempt} failed. Status:`,
        error.status
      );

      // Retry temporary errors
      if (
        (error.status === 503 || error.status === 429) &&
        attempt < maxRetries
      ) {
        console.log("Gemini temporarily unavailable.");
        console.log("Retrying in 2 seconds...");

        await new Promise((resolve) => setTimeout(resolve, 2000));

        continue;
      }

      // Don't retry other errors
      throw error;
    }
  }
}


// ===============================
// TEXT RESPONSE
// ===============================

async function generateResponse(chatHistory) {
  try {
    const response = await generateWithRetry({
      model: "gemini-3.5-flash-lite",
      contents: chatHistory,
    });

    return response.text;

  } catch (error) {
    console.error("Gemini Text Error:");
    console.error(error);

    throw error;
  }
}


// ===============================
// IMAGE RESPONSE
// ===============================

async function generateResponseWithImage(
  base64Image,
  mimeType,
  userText
) {
  try {
    const response = await generateWithRetry({
      model: "gemini-3.5-flash-lite",

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
              text:
                userText ||
                "What is in this image? Describe it in detail.",
            },
          ],
        },
      ],
    });

    return response.text;

  } catch (error) {
    console.error("Gemini Image Error:");
    console.error(error);

    throw error;
  }
}


// ===============================
// EXPORT
// ===============================

module.exports = {
  generateResponse,
  generateResponseWithImage,
};