# 빌드 단계
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build  # Vite 기준: dist/ 생성

# 런타임: nginx로 정적 서빙
FROM nginx:1.27-alpine
COPY --from=build /app/dist/ /usr/share/nginx/html
# 기본 nginx.conf는 compose에서 마운트
