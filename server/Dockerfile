# Use official Node.js lightweight image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for efficient caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Define environment variables (Can be overridden at runtime)
# ENV PORT=3000
# ENV GEMINI_API_KEY=... 

# Start the server
CMD ["npm", "start"]
