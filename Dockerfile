# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app

# 先装依赖，利用镜像层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 再拷源码构建
COPY . .
RUN npm run build

# 运行阶段：用 nginx 托管静态产物
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
