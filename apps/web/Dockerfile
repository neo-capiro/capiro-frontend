# Build context: repository root. This pinned Node 24 Alpine base uses a
# vendor-fixed zlib package for CVE-2026-85091. Confirm the package version,
# container behavior and image scan before runtime admission.
FROM public.ecr.aws/docker/library/node:24.21.0-alpine3.23@sha256:9ec4a2e289874ed0d722e1772ec2de45d2801541db8612f3638b26f128c69ac2 AS base
RUN apk add --no-cache --upgrade zlib=1.3.2-r1 ca-certificates
WORKDIR /app

FROM base AS build
RUN npm install --global npm@11.9.0 --ignore-scripts --no-audit --no-fund \
    && test "$(npm --version)" = 11.9.0
COPY . .
RUN npm ci --ignore-scripts --no-audit --no-fund
# Next 16.4.1's proxy error sink logs the full proxied target and re-rejects the raw upstream
# error. Bring the installed package to the pinned corrected bytes before the build; the step
# is idempotent and refuses an unexpected package or file.
RUN node scripts/patch-next-proxy-error-log.cjs
RUN NODE_OPTIONS=--max-old-space-size=4096 CIRCLE_NODE_TOTAL=2 npm run build
# Fail the image build if the corrected framework file is not in the packaged standalone output.
RUN node scripts/patch-next-proxy-error-log.cjs --verify-standalone apps/web/.next/standalone

FROM base AS runtime
ARG GIT_SHA
ARG RELEASE_SHA
ARG IMAGE_REPO="neo-capiro/capiro-frontend"
LABEL org.opencontainers.image.source="https://github.com/neo-capiro/capiro-frontend" \
      org.opencontainers.image.revision="$GIT_SHA" \
      org.opencontainers.image.version="$RELEASE_SHA" \
      com.capiro.image.repo="$IMAGE_REPO"
# The running image reports its own commit (Preferences footer, /api/build) without a task-definition env.
ENV GIT_SHA=$GIT_SHA RELEASE_SHA=$RELEASE_SHA
RUN rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22 \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production PORT=5188 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 5188
CMD ["node", "apps/web/server.js"]
