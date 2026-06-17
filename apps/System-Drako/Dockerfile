# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Serve ----------
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache gettext

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/config.json.template /etc/nginx/config.json.template
COPY docker/nginx-runtime-config.sh /docker-entrypoint.d/40-drako-config.sh
RUN chmod +x /docker-entrypoint.d/40-drako-config.sh

COPY --from=build /app/dist /usr/share/nginx/html

ENV OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
ENV OPENROUTER_API_KEY=

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
