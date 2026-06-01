FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates --fresh
RUN npm install -g tsx
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["tsx", "bot-worker.ts"]
