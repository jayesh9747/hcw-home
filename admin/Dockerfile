FROM docker.io/node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN apk add make
RUN make

FROM docker.io/nginx:alpine
COPY --from=builder /app/dist/admin/browser/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]