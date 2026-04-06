# Set up PostgreSQL client for backup functionality
FROM node:18-alpine

# Install PostgreSQL client for backup functionality
RUN apk add --no-cache postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production

# Copy server files
COPY server/ ./server/

# Generate Prisma client
RUN cd server && npx prisma generate

# Expose port
EXPOSE 5000

# Start the application
CMD ["cd", "server", "&&", "npm", "start"]
