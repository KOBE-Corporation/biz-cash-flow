ARG NODE_VERSION=22.15.0

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm run dev"]
