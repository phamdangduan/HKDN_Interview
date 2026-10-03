# ==============================================================================
# 🐳 TALENTAI MULTI-STAGE DOCKERFILE
# Stage 1: Build TypeScript application & Prisma Client
# ==============================================================================
FROM node:20-slim AS builder

# Cài đặt OpenSSL cần thiết cho Prisma ORM engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend-ts

# Copy file cấu hình thư viện & schema prisma
COPY backend-ts/package*.json ./
COPY backend-ts/prisma ./prisma/

# Cài đặt toàn bộ dependencies và khởi tạo Prisma Client
RUN npm install
RUN npx prisma generate

# Copy mã nguồn TypeScript và cấu hình compiler
COPY backend-ts/tsconfig.json ./
COPY backend-ts/src ./src/

# Biên dịch mã nguồn TypeScript thành JavaScript trong thư mục dist/
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime (Siêu nhẹ, Tối ưu bảo mật)
# ==============================================================================
FROM node:20-slim AS runner

# Cài đặt OpenSSL cho runtime kết nối database
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy thư viện và bản build từ stage builder
COPY --from=builder /app/backend-ts/package*.json ./backend-ts/
COPY --from=builder /app/backend-ts/node_modules ./backend-ts/node_modules/
COPY --from=builder /app/backend-ts/dist ./backend-ts/dist/
COPY --from=builder /app/backend-ts/prisma ./backend-ts/prisma/

# Copy toàn bộ giao diện Frontend
COPY frontend ./frontend/

WORKDIR /app/backend-ts

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

# Khởi chạy server production
CMD ["node", "dist/main.js"]
