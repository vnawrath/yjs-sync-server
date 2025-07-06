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

// Track active rooms and their connection counts
const activeRooms = new Map();

// Create HTTP server
const httpServer = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // Handle rooms listing endpoint
  if (url.pathname === "/rooms" && request.method === "GET") {
    // Check API key authorization
    const apiKey = url.searchParams.get("apiKey");
    if (apiKey !== VALID_API_KEY) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Return list of active rooms
    const rooms = Array.from(activeRooms.entries()).map(
      ([roomName, connections]) => ({
        name: roomName,
        connections: connections,
      })
    );

    response.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    response.end(JSON.stringify({ rooms }));
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("YJS Sync Server");
});

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Create YJS server
const yjss = createYjsServer({
  createDoc: () => new Y.Doc(),
  logger: console,
  onDocumentCreate: (docName) => {
    console.log(`Document created: ${docName}`);
    activeRooms.set(docName, (activeRooms.get(docName) || 0) + 1);
  },
  onDocumentDestroy: (docName) => {
    console.log(`Document destroyed: ${docName}`);
    const count = activeRooms.get(docName) || 0;
    if (count <= 1) {
      activeRooms.delete(docName);
    } else {
      activeRooms.set(docName, count - 1);
    }
  },
});

// Handle WebSocket connections
wss.on("connection", (socket, request) => {
  // Extract room name from URL
  const url = new URL(request.url, `http://${request.headers.host}`);
  const roomName = url.pathname.slice(1); // Remove leading slash

  // Authenticate connection
  const whenAuthorized = authorize(socket, request).catch(() => {
    socket.close(4001, "Unauthorized");
    return false;
  });

  // Track room connection
  socket.on("close", () => {
    if (roomName) {
      const count = activeRooms.get(roomName) || 0;
      if (count <= 1) {
        activeRooms.delete(roomName);
      } else {
        activeRooms.set(roomName, count - 1);
      }
    }
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
