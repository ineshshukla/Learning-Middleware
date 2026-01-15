
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Set environment variables for build time
ARG NEXT_PUBLIC_INSTRUCTOR_API_URL
ARG NEXT_PUBLIC_LEARNER_API_URL
ARG NEXT_PUBLIC_ORCHESTRATOR_API_URL
ARG NEXT_PUBLIC_SME_API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_INSTRUCTOR_API_URL=$NEXT_PUBLIC_INSTRUCTOR_API_URL
ENV NEXT_PUBLIC_LEARNER_API_URL=$NEXT_PUBLIC_LEARNER_API_URL
ENV NEXT_PUBLIC_ORCHESTRATOR_API_URL=$NEXT_PUBLIC_ORCHESTRATOR_API_URL
ENV NEXT_PUBLIC_SME_API_URL=$NEXT_PUBLIC_SME_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# NOTE: This requires output: "standalone" in next.config.mjs. 
# Since we are not modifying next.config.mjs, we will use the standard start command.
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
