require('dotenv').config();

const app = require('./src/app');
const { createServer } = require('http');
const { Server } = require('socket.io');

const {
  generateResponse,
  generateResponseWithImage
} = require('./src/service/ai.service');

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
  maxHttpBufferSize: 10e6
});

const chatHistory = [];

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  // =========================
  // TEXT MESSAGE
  // =========================
  socket.on("ai-message", async (data) => {
    console.log("AI message received:", data);

    chatHistory.push({
      role: "user",
      parts: [
        {
          text: data
        }
      ]
    });

    try {
      console.time("Gemini Text Response");

      const response = await generateResponse(chatHistory);

      console.timeEnd("Gemini Text Response");

      chatHistory.push({
        role: "model",
        parts: [
          {
            text: response
          }
        ]
      });

      socket.emit("ai-message-response", {
        response: response
      });

    } catch (error) {
      console.timeEnd("Gemini Text Response");

      console.error("FULL GEMINI ERROR:");
      console.error(error);

      // Gemini temporarily unavailable
      if (error.status === 503) {
        socket.emit("ai-message-response", {
          response:
            "Gemini is temporarily unavailable. Please try again in a few seconds."
        });

      // Gemini quota exceeded
      } else if (error.status === 429) {
        socket.emit("ai-message-response", {
          response:
            "Gemini API quota exceeded. Please try again later."
        });

      // Other Gemini errors
      } else {
        socket.emit("ai-message-response", {
          response:
            "Gemini API error. Please check the server terminal."
        });
      }
    }
  });

  // =========================
  // IMAGE MESSAGE
  // =========================
  socket.on("ai-image-message", async (data) => {
    console.log("Image message received");

    const {
      base64Image,
      mimeType,
      userText
    } = data;

    try {
      console.time("Gemini Image Response");

      const response = await generateResponseWithImage(
        base64Image,
        mimeType,
        userText
      );

      console.timeEnd("Gemini Image Response");

      chatHistory.push({
        role: "model",
        parts: [
          {
            text: response
          }
        ]
      });

      socket.emit("ai-message-response", {
        response: response
      });

    } catch (error) {
      console.timeEnd("Gemini Image Response");

      console.error("FULL GEMINI IMAGE ERROR:");
      console.error(error);

      if (error.status === 503) {
        socket.emit("ai-message-response", {
          response:
            "Gemini is temporarily unavailable. Please try again in a few seconds."
        });

      } else if (error.status === 429) {
        socket.emit("ai-message-response", {
          response:
            "Gemini API quota exceeded. Please try again later."
        });

      } else {
        socket.emit("ai-message-response", {
          response:
            "Sorry, I couldn't process that image."
        });
      }
    }
  });
});

// =========================
// START SERVER
// =========================

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});