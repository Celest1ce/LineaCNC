FROM node:24-bookworm-slim

WORKDIR /app

ARG DB_HOST=mariadb
ARG DB_PORT=3306
ARG DB_USER=lineacnc
ARG DB_PASS=lineacncpassword
ARG DB_NAME=lineacnc
ARG SESSION_SECRET=change_me_session_secret

ENV DB_HOST=${DB_HOST}
ENV DB_PORT=${DB_PORT}
ENV DB_USER=${DB_USER}
ENV DB_PASS=${DB_PASS}
ENV DB_NAME=${DB_NAME}
ENV SESSION_SECRET=${SESSION_SECRET}

# Native modules (bcrypt/sharp) build dependencies when prebuilt binaries are unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies using workspace manifests first for better Docker cache usage.
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

COPY . .

RUN npm run build --workspace=apps/api

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["npm", "run", "start"]
