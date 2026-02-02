# Build stage for frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy backend files
COPY package*.json ./
RUN npm install --production

COPY server.js ./

# Create public directory and copy built frontend
RUN mkdir -p public
COPY --from=frontend-build /app/frontend/dist ./public/

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["node", "server.js"]
