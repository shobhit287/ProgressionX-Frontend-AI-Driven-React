FROM node:20 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm install --no-save lightningcss-linux-x64-gnu
RUN npm run build

# Final image (VERY SMALL)
FROM nginx:alpine

# remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]