FROM node:20-slim

WORKDIR /app

# Install required dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Copy pre-installed node_modules
COPY node_modules ./node_modules

# Rebuild native modules for Linux
RUN npm rebuild better-sqlite3

# Copy built dist folder
COPY dist ./dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
