# ==========================================
# Stage 1: Builder
# ==========================================
FROM golang:1.26-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package management files first (to leverage Docker cache)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the project files (source code)
COPY . .

# Build the binary without C dependencies to run on any environment
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o techprep-app main.go


# ==========================================
# Stage 2: Production (Lightweight final image)
# ==========================================
FROM alpine:latest

# Install security certificates to communicate with Google API and GitHub without SSL errors
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the executable binary from the builder stage
COPY --from=builder /app/techprep-app .

# Copy the static directory containing HTML, CSS, JS
# (Ensure the static directory path matches your project)
COPY --from=builder /app/static ./static

# If you have other files like templates, you can copy them here
# COPY --from=builder /app/templates ./templates

# Expose the port the server listens on
EXPOSE 8080

# Command to run the server
CMD ["./techprep-app"]