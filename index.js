const { Server } = require("yjs-server");

// Get API key from environment variable
const VALID_API_KEY = process.env.API_KEY;

if (!VALID_API_KEY) {
  console.error("Error: API_KEY environment variable is required");
  process.exit(1);
}

// Create a new server instance
const server = new Server({
  port: process.env.PORT || 1234,
  // Add authentication middleware
  onConnect: (ws, req) => {
    const apiKey = req.headers["x-api-key"];

    if (apiKey !== VALID_API_KEY) {
      console.log("Authentication failed: Invalid API key");
      ws.close(4001, "Invalid API key");
      return false;
    }

    console.log("Client authenticated successfully");
    return true;
  },
  // Disable persistence as requested
  persistence: null,
});

// Log when server starts
server.on("listening", () => {
  console.log(`Yjs Sync Server is running on port ${process.env.PORT || 1234}`);
});

// Log connection events
server.on("connection", () => {
  console.log("New client connected");
});

// Log disconnection events
server.on("disconnection", () => {
  console.log("Client disconnected");
});

// Log any errors
server.on("error", (err) => {
  console.error("Server error:", err);
});
