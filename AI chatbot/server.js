require('dotenv').config()
const app = require('./src/app')
const { createServer } = require("http");
const { Server } = require("socket.io");
const { generateResponse, generateResponseWithImage } = require('./src/service/ai.service')

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
  maxHttpBufferSize: 10e6 // 10MB — image ke liye zaroorat hai
});

const chatHistory = []

io.on("connection", (socket) => {
  console.log('A user connected')

  socket.on("disconnect", () => {
    console.log('A user disconnect')
  })

  /** Text message */
  socket.on("ai-message", async (data) => {
  console.log("Ai message received:", data)
  chatHistory.push({ role: 'user', parts: [{ text: data }] })
  try {
    const response = await generateResponse(chatHistory)
    chatHistory.push({ role: 'model', parts: [{ text: response }] })
    socket.emit("ai-message-response", { response })
  } catch (error) {
    console.error("API Error:", error.status)
    if (error.status === 429) {
      socket.emit("ai-message-response", { 
        response: "⚠️ API quota exceeded. Please wait a few minutes and try again." 
      })
    } else {
      socket.emit("ai-message-response", { 
        response: "Something went wrong. Please try again." 
      })
    }
  }
})

  /** Image message — NEW */
  socket.on("ai-image-message", async (data) => {
    console.log("Image message received")
    const { base64Image, mimeType, userText } = data

    try {
      const response = await generateResponseWithImage(base64Image, mimeType, userText)
      chatHistory.push({
        role: 'model',
        parts: [{ text: response }]
      })
      socket.emit("ai-message-response", { response })
    } catch (error) {
      console.error("Image processing error:", error)
      socket.emit("ai-message-response", { response: "Sorry, I couldn't process that image. Please try again." })
    }
  })

});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000")
})