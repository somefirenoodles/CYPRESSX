FROM node:22.20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
ENV CYPRESS_INSTALL_BINARY=0
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm types && pnpm build

FROM node:22.20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/backend ./backend
COPY --from=build /app/database ./database
COPY --from=build /app/build ./build
EXPOSE 3001
CMD ["sh", "-c", "pnpm db:setup && pnpm start"]
