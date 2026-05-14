const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const supabase = require("./config/supabase");
const { indexMessage } = require("./config/algolia");

// Load ENV
dotenv.config();

const app = express();

const allowedOrigins = [
  "https://vibe-chat-uz4a.onrender.com", 
  "http://localhost:5173", 
  "http://localhost:5174", 
  "http://localhost:3000",
  /^https:\/\/vibe-chat.*\.vercel\.app$/
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files from the React app build (Disabled because frontend is hosted on Vercel)
// app.use(express.static(path.join(__dirname, "../sign-up/dist")));

// Routes
const authRoutes = require("./routes/auth.routes");
const messageRoutes = require("./routes/message.routes");
const roomRoutes = require("./routes/room.routes");
const searchRoutes = require("./routes/search.routes");

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/search", searchRoutes);


// Test Route (Internal use)
app.get("/api/health", (req, res) => {
  res.send("server is working with Supabase");
});

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket Events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log("User joined room:", room);
  });

  socket.on("send_message", async (data) => {
    try {
      // Find room by name or ID
      let roomId = data.room;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(data.room)) {
        const { data: roomObj, error: fetchError } = await supabase
          .from('rooms')
          .select('id')
          .eq('name', data.room)
          .single();

        if (fetchError || !roomObj) {
          // Create room if it doesn't exist
          const { data: newRoom, error: insertError } = await supabase
            .from('rooms')
            .insert([{ name: data.room, created_by: data.senderId }])
            .select()
            .single();
          
          if (insertError) throw insertError;
          roomId = newRoom.id;
        } else {
          roomId = roomObj.id;
        }
      }

      // Save message to Supabase
      const { data: newMessage, error: msgError } = await supabase
        .from('messages')
        .insert([
          {
            room_id: roomId,
            sender_id: data.senderId,
            text: data.text
          }
        ])
        .select('*, users(username, avatar)')
        .single();

      if (msgError) throw msgError;

      // Index in Algolia (non-blocking — message is already saved)
      const senderName = newMessage.users?.username || data.senderId;
      indexMessage(newMessage, senderName, data.room);

      // Emit to everyone in the room
      io.to(data.room).emit("receive_message", {
        ...newMessage,
        sender: newMessage.users ? { _id: newMessage.sender_id, username: newMessage.users.username, avatar: newMessage.users.avatar } : newMessage.sender_id,
        room: data.room // Keep the room name for frontend compatibility
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
// Catch-all handler for SPA (Disabled because frontend is hosted on Vercel)
// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(__dirname, "../sign-up/dist", "index.html"));
// });


// Port
const PORT = process.env.PORT || 9096;

// Start Server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
