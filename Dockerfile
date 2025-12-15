# Base stage for Node applications
FROM node:18-alpine as base
WORKDIR /app

# --- Gateway Stage ---
FROM base as gateway
WORKDIR /app/gateway
COPY gateway/package*.json ./
RUN npm install
COPY gateway/ .
CMD ["npm", "start"]

# --- Backend Service Stage ---
FROM base as backend-service
WORKDIR /app/backend-service
COPY backend-service/package*.json ./
RUN npm install
COPY backend-service/ .
CMD ["npm", "start"]

# --- Admin UI Build Stage ---
FROM node:18-alpine as admin-ui-build
WORKDIR /app/admin-ui
COPY admin-ui/package*.json ./
RUN npm install
COPY admin-ui/ .
RUN npm run build

# --- Admin UI Runtime Stage (Nginx) ---
FROM nginx:alpine as admin-ui
COPY --from=admin-ui-build /app/admin-ui/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
