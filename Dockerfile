# Stage 1: Build dependencies
FROM node:20 as build

# Set the working directory
WORKDIR /app

# Copy only package.json and package-lock.json for efficient caching of dependencies
COPY package*.json ./

# Install production dependencies (no dev dependencies)
RUN npm ci --only=production

# Copy the rest of the application code (excluding dev dependencies)
COPY . .

# Stage 2: Production image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy the production dependencies and app code from the build stage
COPY --from=build /app /app

# Expose the app's port
EXPOSE 5000

# Set environment to production (optional)
ENV NODE_ENV=production

# Start the application using Node for production
CMD ["node", "app.js"]
