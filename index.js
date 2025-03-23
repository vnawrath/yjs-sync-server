import { WebSocketServer } from "ws";
import { createYjsServer } from "yjs-server";
import * as Y from "yjs";
import http from "http";

// Get API key from environment variable
const VALID_API_KEY = process.env.API_KEY;

if (!VALID_API_KEY) {
  console.error("Error: API_KEY environment variable is required");
  process.exit(1);
}

// Create HTTP server
const httpServer = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("YJS Sync Server");
});

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Create YJS server
const yjss = createYjsServer({
  createDoc: () => new Y.Doc(),
  logger: console,
});

// Handle WebSocket connections
wss.on("connection", (socket, request) => {
  // Authenticate connection
  const whenAuthorized = authorize(socket, request).catch(() => {
    socket.close(4001, "Unauthorized");
    return false;
  });

  // Handle connection with authentication
  yjss.handleConnection(socket, request, whenAuthorized);
});

// Authorization function
async function authorize(socket, request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const apiKey = url.searchParams.get("apiKey");

  if (apiKey !== VALID_API_KEY) {
    console.log("Authentication failed: Invalid API key");
    return false;
  }

  console.log("Client authenticated successfully");
  return true;
}

// Handle upgrade requests
httpServer.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Start server
const port = process.env.PORT || 1234;
httpServer.listen(port, () => {
  console.log(`Yjs Sync Server is running on port ${port}`);
});

// Handle server shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down server...");
  yjss.close();
  httpServer.close();
});
