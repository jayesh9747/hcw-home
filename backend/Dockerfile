# Étape 1 : Build de l'app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npx yarn install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY .env.example .env
EXPOSE 3000
CMD ["node", "dist/main"]