FROM node:20-slim

# Install system dependencies for native modules and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies (including devDependencies for build step)
RUN npm ci

# Copy all source files
COPY . .

# Build both frontend and backend
RUN npm run build

# Expose the default port
EXPOSE 5000

# Default command to run the web server
CMD ["npm", "start"]
