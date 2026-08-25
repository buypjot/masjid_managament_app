# Multi-stage build for minimal image size and ~10MB RAM usage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production runtime using ultra-light Nginx Alpine (~10MB RAM footprint)
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 9017

CMD ["nginx", "-g", "daemon off;"]
