# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app

# 先装依赖，利用镜像层缓存
COPY package.json package-lock.json ./

# 本地若用 npmmirror 镜像，lockfile 里会写死镜像的绝对下载地址，
# 构建机上 npm 会以 EALLOWREMOTE 拒绝抓取。这里统一改回官方源再安装。
# 两个源的包内容一致，integrity 校验值不受影响。
RUN sed -i 's#registry\.npmmirror\.com#registry.npmjs.org#g' package-lock.json \
    && npm ci --registry=https://registry.npmjs.org

# 再拷源码构建
COPY . .
RUN npm run build

# 运行阶段：用 nginx 托管静态产物
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
