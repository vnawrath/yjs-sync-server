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

// CORS headers helper function
function setCORSHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  response.setHeader("Access-Control-Allow-Credentials", "false");
  response.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
}

// Create HTTP server
const httpServer = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // Set CORS headers for all requests
  setCORSHeaders(response);

  // Handle preflight requests (OPTIONS method)
  if (request.method === "OPTIONS") {
    response.writeHead(200);
    response.end();
    return;
  }

  // Handle rooms listing endpoint
  if (url.pathname === "/rooms" && request.method === "GET") {
    // Check API key authorization
    const apiKey = url.searchParams.get("apiKey");
    if (apiKey !== VALID_API_KEY) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Update room tracking before responding
    updateRoomTracking();

    // Return list of active rooms
    const rooms = Array.from(activeRooms.entries()).map(
      ([roomName, connections]) => ({
        name: roomName || "unnamed-room",
        connections: connections,
      })
    );

    console.log(`Room listing requested. Active rooms Map:`, activeRooms);
    console.log(`Formatted rooms response:`, rooms);
    response.writeHead(200, {
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ rooms }));
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("YJS Sync Server");
});

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Create YJS server with simple document creation (no room tracking here)
const yjss = createYjsServer({
  createDoc: () => {
    console.log("Creating Y.Doc (no room tracking at createDoc level)");
    return new Y.Doc();
  },
  logger: console,
});

// Handle WebSocket connections
wss.on("connection", (socket, request) => {
  console.log("New WebSocket connection");

  // Extract room name from the request URL
  const url = new URL(request.url, `http://${request.headers.host}`);
  const roomName = url.pathname.slice(1); // Remove leading slash
  console.log(`Connection URL: ${request.url}`);
  console.log(`Extracted room name: "${roomName}"`);

  // If we have a valid room name, track it
  if (roomName && roomName !== "") {
    activeRooms.set(roomName, (activeRooms.get(roomName) || 0) + 1);
    console.log(
      `Room "${roomName}" now has ${activeRooms.get(roomName)} connection(s)`
    );
  }

  // Authenticate connection
  const whenAuthorized = authorize(socket, request).catch(() => {
    socket.close(4001, "Unauthorized");
    return false;
  });

  // Track disconnections to clean up rooms
  socket.on("close", () => {
    console.log("WebSocket connection closed");
    if (roomName && roomName !== "") {
      const count = activeRooms.get(roomName) || 0;
      if (count <= 1) {
        activeRooms.delete(roomName);
        console.log(`Room "${roomName}" removed (no more connections)`);
      } else {
        activeRooms.set(roomName, count - 1);
        console.log(`Room "${roomName}" now has ${count - 1} connection(s)`);
      }
    }
    // Also update room tracking from yjs-server docs
    updateRoomTracking();
  });

  // Handle connection with authentication
  yjss.handleConnection(socket, request, whenAuthorized);
});

// Function to update room tracking from yjs-server's internal document store
function updateRoomTracking() {
  // Don't clear existing tracking - just supplement it

  // Access yjs-server's internal document store
  if (yjss.docs) {
    console.log("Updating room tracking from yjs-server docs...");
    console.log("Available docs in yjs-server:", Array.from(yjss.docs.keys()));

    for (const [docName, doc] of yjss.docs) {
      if (docName && docName !== "" && docName !== "undefined") {
        // Only update if we don't already have this room tracked
        if (!activeRooms.has(docName)) {
          activeRooms.set(docName, 1);
          console.log(`Found new active room: "${docName}"`);
        }
      }
    }
  }

  console.log(
    "Room tracking updated. Current rooms:",
    Array.from(activeRooms.keys())
  );
}

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
