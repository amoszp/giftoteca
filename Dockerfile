# ---------- 1. Build the app ----------
FROM node:24-alpine AS client
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- 2. Server dependencies ----------
FROM node:24-alpine AS server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./

# ---------- 3. Runtime ----------
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    GIFTOTECA_DATA_DIR=/data \
    GIFTOTECA_DIST=/app/dist

WORKDIR /app
RUN addgroup -S giftoteca && adduser -S giftoteca -G giftoteca \
  && mkdir -p /data && chown -R giftoteca:giftoteca /app /data
USER giftoteca

COPY --from=server --chown=giftoteca:giftoteca /app/server /app/server
COPY --from=client --chown=giftoteca:giftoteca /app/dist /app/dist

# SQLite database (each account's synced data)
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

WORKDIR /app/server
CMD ["node", "index.js"]
