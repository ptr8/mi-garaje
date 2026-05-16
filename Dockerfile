FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm install

FROM deps AS frontend-build
WORKDIR /app
COPY frontend frontend
RUN npm run build --workspace frontend

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/
RUN npm install --omit=dev --workspace backend
COPY backend backend
COPY --from=frontend-build /app/frontend/dist backend/public
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "backend"]
