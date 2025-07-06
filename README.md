# Yjs Sync Server

A simple and secure WebSocket server for synchronizing [Yjs](https://yjs.dev/) documents across clients.

## Features

- WebSocket-based real-time synchronization
- API key authentication for security
- **Room listing endpoint to discover active rooms**
- Simple deployment with environment variable configuration

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/vnawrath/yjs-sync-server
   cd yjs-sync-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

The server requires an API key for authentication. Set this up using environment variables:

```bash
# Required
export API_KEY=your-secret-api-key

# Optional (defaults to 1234)
export PORT=3000
```

### Running the Server

Start the server:

```bash
node index.js
```

You should see output similar to:

```
Yjs Sync Server is running on port 1234
```

## Connecting Clients

To connect a client application to this sync server, use the Yjs WebSocket provider with authentication:

```javascript
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  "ws://localhost:1234",
  "document-name",
  doc,
  { params: { apiKey: "your-secret-api-key" } }
);

// Now you can use the doc and it will sync automatically
```

## Getting List of Active Rooms

You can get a list of currently active rooms by making an HTTP GET request to the `/rooms` endpoint:

### Using JavaScript/Fetch

```javascript
async function getActiveRooms() {
  try {
    const response = await fetch(
      "http://localhost:1234/rooms?apiKey=your-secret-api-key"
    );
    const data = await response.json();
    console.log("Active rooms:", data.rooms);
    return data.rooms;
  } catch (error) {
    console.error("Error fetching rooms:", error);
  }
}

// Example usage
getActiveRooms().then((rooms) => {
  rooms.forEach((room) => {
    console.log(`Room: ${room.name}, Connections: ${room.connections}`);
  });
});
```

### Using cURL

```bash
curl "http://localhost:1234/rooms?apiKey=your-secret-api-key"
```

The response will be in the format:

```json
{
  "rooms": [
    {
      "name": "document-name-1",
      "connections": 3
    },
    {
      "name": "document-name-2",
      "connections": 1
    }
  ]
}
```

## API Endpoints

- `GET /rooms?apiKey=<your-api-key>` - Returns list of active rooms with connection counts
- WebSocket connections at `ws://localhost:1234/<room-name>?apiKey=<your-api-key>`

**Note:** The room name is passed in the WebSocket URL path, not as a parameter to the WebsocketProvider constructor. For example, if you want to connect to a room called "my-document", the WebSocket URL would be `ws://localhost:1234/my-document?apiKey=your-api-key`.

## Deployment

When deploying to production:

1. Always use a secure, randomly generated API key
2. Consider using HTTPS for the server
3. Set appropriate PORT environment variable if needed

## Security Considerations

- Keep your API key secret and rotate it periodically
- For production use, consider additional authentication mechanisms
- Deploy behind a reverse proxy for TLS termination in production environments

## License

[Add your license information here]
