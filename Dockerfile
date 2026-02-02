# Build stage for frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Final stage
FROM node:18-alpine
WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm install

# Setup server
COPY server/package.json server/
RUN cd server && npm install
COPY server/ server/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/client/dist client/dist

# Expose port
EXPOSE 3001

# Set production env
ENV NODE_ENV=production

# Filesystem volume mount point (optional, but good practice to document)
VOLUME ["/data"]

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
