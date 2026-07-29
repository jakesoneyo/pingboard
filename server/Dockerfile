# syntax=docker/dockerfile:1

# --- deps + build stage -----------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
# devDependencies(타입, nest-cli, ts-node 등)까지 설치해야 build가 된다.
# newGym에서 devDeps 누락으로 빌드가 실패했던 사고를 반복하지 않기 위해 명시적으로 --include=dev.
RUN npm ci --include=dev

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- production stage --------------------------------------------------------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY migrations ./migrations

EXPOSE 3000
CMD ["node", "dist/main.js"]
