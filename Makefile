# Docker registry configuration
REGISTRY := qnap.local.stfuawsc.com:5000
IMAGE_NAME := signage-app
TAG := latest
FULL_IMAGE := $(REGISTRY)/$(IMAGE_NAME):$(TAG)

# Default target
.PHONY: all
all: docker-push

# Build the application
.PHONY: build
build:
	@echo "Building application..."
	npm run build

# Build Docker image
.PHONY: docker-build
docker-build:
	@echo "Building Docker image..."
	docker build -t $(FULL_IMAGE) .

# Push Docker image to registry
.PHONY: docker-push
docker-push: docker-build
	@echo "Pushing Docker image to registry..."
	docker push $(FULL_IMAGE)

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf server/dist client/dist

# Show current configuration
.PHONY: info
info:
	@echo "Registry: $(REGISTRY)"
	@echo "Image: $(IMAGE_NAME)"
	@echo "Tag: $(TAG)"
	@echo "Full image name: $(FULL_IMAGE)"

# Help
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all          - Build Docker image and push to registry (default)"
	@echo "  build        - Build the application"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-push  - Push Docker image to registry"
	@echo "  clean        - Clean build artifacts"
	@echo "  info         - Show current configuration"
	@echo "  help         - Show this help message"
