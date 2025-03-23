FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the default port
EXPOSE 1234

# Set environment variables with defaults
ENV PORT=1234
ENV API_KEY=""

# Start the server
CMD ["node", "index.js"] 