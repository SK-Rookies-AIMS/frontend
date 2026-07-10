FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
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