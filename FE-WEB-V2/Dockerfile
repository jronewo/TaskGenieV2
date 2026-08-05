# TaskGenie web console — static build served by nginx on Cloud Run.
#
#   docker build -f FE-WEB-V2/Dockerfile \
#     --build-arg VITE_API_BASE_URL=https://<api-service>.run.app/api \
#     -t taskgenie-web FE-WEB-V2

# ── Build ────────────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time — there is no runtime configuration for a static bundle, so
# the API URL has to be known here. Changing it means rebuilding the image, which is why the
# deploy workflow builds the web image only after the API URL is known.
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# nginx's entrypoint renders /etc/nginx/templates/*.template with envsubst, so $PORT from Cloud
# Run lands in the config. Cloud Run may pick any port; hardcoding 80 would fail health checks.
ENV PORT=8080
EXPOSE 8080
