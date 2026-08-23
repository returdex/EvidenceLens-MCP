FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0555 /usr/local/bin/docker-entrypoint.sh

USER node
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
