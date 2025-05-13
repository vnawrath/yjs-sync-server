# Yjs Sync Server

A simple and secure WebSocket server for synchronizing [Yjs](https://yjs.dev/) documents across clients.

## Features

- WebSocket-based real-time synchronization
- API key authentication for security
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
