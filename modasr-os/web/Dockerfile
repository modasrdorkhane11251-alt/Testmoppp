FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=optional

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TG_BOT_USERNAME
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN adduser -D modasr
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER modasr
EXPOSE 3000
CMD ["node", "server.js"]
