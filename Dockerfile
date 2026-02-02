# Build stage for frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json ./
RUN npm install

# Copy frontend source
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy backend package files
COPY package.json ./

# Install backend dependencies
RUN npm install

# Copy backend server and modules
COPY server.js ./
COPY routes/ ./routes/
COPY services/ ./services/
COPY config/ ./config/

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
