# aitema|Hinweis Frontend - Multi-Stage Build
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Nginx Server
FROM nginx:alpine AS production
LABEL org.opencontainers.image.title="aitema|Hinweis Frontend"
LABEL org.opencontainers.image.description="HinSchG-konformes Hinweisgebersystem - Frontend"
LABEL org.opencontainers.image.url="https://aitema.de/loesungen/hinweisgebersystem"
LABEL org.opencontainers.image.source="https://github.com/Aitema-gmbh/hinweisgebersystem"
LABEL org.opencontainers.image.licenses="AGPL-3.0"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/hinweis-frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
