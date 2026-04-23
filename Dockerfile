FROM node:20 AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Final image (VERY SMALL)
FROM nginx:alpine

# remove default nginx html and default server config (the stock
# /etc/nginx/conf.d/default.conf has no SPA fallback, which 404s every
# non-root path)
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]