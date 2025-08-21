# Étape 1 : Build de l'app
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN apk add make python3
RUN make

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY .env.example .env
EXPOSE 3000
CMD ["node", "dist/main"]