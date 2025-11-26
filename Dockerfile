# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build arguments for Vite environment variables
ARG GEMINI_API_KEY
ARG VITE_AUTHENTICATION=false
ARG VITE_APP_USERNAME=admin
ARG VITE_APP_PASSWORD=password123

# Set as environment variables for the build
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV VITE_AUTHENTICATION=$VITE_AUTHENTICATION
ENV VITE_APP_USERNAME=$VITE_APP_USERNAME
ENV VITE_APP_PASSWORD=$VITE_APP_PASSWORD

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
