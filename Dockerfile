FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=https://aims-factory.com
ARG VITE_AI_API_BASE_URL=https://aims-factory.com/api/ai
ARG VITE_QUALITY_API_BASE_URL=https://aims-factory.com/api/quality/inspection
ARG VITE_PROCESS_API_BASE_URL=https://aims-factory.com/api/process
ARG VITE_WS_BASE_URL=wss://aims-factory.com
ARG VITE_SOCKJS_URL=https://aims-factory.com/ws


ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AI_API_BASE_URL=$VITE_AI_API_BASE_URL
ENV VITE_QUALITY_API_BASE_URL=$VITE_QUALITY_API_BASE_URL
ENV VITE_PROCESS_API_BASE_URL=$VITE_PROCESS_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_SOCKJS_URL=$VITE_SOCKJS_URL

RUN npm run build

RUN mkdir -p /app/out \
  && if [ -d dist ]; then cp -r dist/* /app/out/; \
     elif [ -d build ]; then cp -r build/* /app/out/; \
     else echo "No build output directory. Expected dist or build." && exit 1; fi

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
