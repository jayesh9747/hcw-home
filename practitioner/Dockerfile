FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN apk add make
RUN make

FROM nginx:alpine
COPY --from=builder /app/dist/practitioner/browser/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]