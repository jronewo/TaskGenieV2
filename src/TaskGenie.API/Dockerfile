# TaskGenie API — container image for Cloud Run.
#
# Build context is the repository root, not this folder, because the API references the three
# sibling projects:
#   docker build -f src/TaskGenie.API/Dockerfile -t taskgenie-api .

# ── Build ────────────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Project files first, restored on their own: this layer only changes when a dependency changes,
# so editing code re-uses the cached restore instead of re-downloading every package.
COPY src/TaskGenie.Domain/TaskGenie.Domain.csproj                 src/TaskGenie.Domain/
COPY src/TaskGenie.Application/TaskGenie.Application.csproj       src/TaskGenie.Application/
COPY src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj src/TaskGenie.Infrastructure/
COPY src/TaskGenie.API/TaskGenie.API.csproj                       src/TaskGenie.API/
RUN dotnet restore src/TaskGenie.API/TaskGenie.API.csproj

COPY src/ src/
RUN dotnet publish src/TaskGenie.API/TaskGenie.API.csproj -c Release -o /app/publish --no-restore

# ── Runtime ──────────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Cloud Run sends traffic to whatever $PORT says and terminates TLS itself, so the container
# listens on plain HTTP. Program.cs reads X-Forwarded-Proto so the app still knows the request
# was HTTPS.
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 8080

# Runs as a non-root user: a container that is compromised should not also be root inside it.
# The base image ships this account already.
USER $APP_UID

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TaskGenie.API.dll"]
