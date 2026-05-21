FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/

RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --workspace=apps/web

EXPOSE 5173

CMD ["npm", "run", "preview", "--workspace=apps/web", "--", "--host", "0.0.0.0", "--port", "5173"]
