#!/bin/bash

# AskMe Chat Docker Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="askme-chat"
CONTAINER_NAME="askme-chat-container"
PORT="80"

echo -e "${GREEN}🚀 AskMe Chat Docker Deployment${NC}"

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to build the image
build_image() {
    echo -e "${YELLOW}📦 Building Docker image...${NC}"
    docker build -t $IMAGE_NAME .
    echo -e "${GREEN}✅ Image built successfully!${NC}"
}

# Function to stop and remove existing container
cleanup_container() {
    if docker ps -a --format "table {{.Names}}" | grep -q $CONTAINER_NAME; then
        echo -e "${YELLOW}🔄 Stopping existing container...${NC}"
        docker stop $CONTAINER_NAME > /dev/null 2>&1 || true
        docker rm $CONTAINER_NAME > /dev/null 2>&1 || true
        echo -e "${GREEN}✅ Container cleaned up!${NC}"
    fi
}

# Function to run the container
run_container() {
    echo -e "${YELLOW}🚀 Starting container...${NC}"
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:80 \
        --restart unless-stopped \
        $IMAGE_NAME
    
    echo -e "${GREEN}✅ Container started successfully!${NC}"
    echo -e "${GREEN}🌐 Application is running at: http://localhost:$PORT${NC}"
}

# Function to show container status
show_status() {
    echo -e "${YELLOW}📊 Container Status:${NC}"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to show logs
show_logs() {
    echo -e "${YELLOW}📋 Container Logs:${NC}"
    docker logs $CONTAINER_NAME
}

# Function to stop the container
stop_container() {
    echo -e "${YELLOW}🛑 Stopping container...${NC}"
    docker stop $CONTAINER_NAME
    echo -e "${GREEN}✅ Container stopped!${NC}"
}

# Function to remove the container
remove_container() {
    echo -e "${YELLOW}🗑️ Removing container...${NC}"
    docker stop $CONTAINER_NAME > /dev/null 2>&1 || true
    docker rm $CONTAINER_NAME > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Container removed!${NC}"
}

# Function to remove the image
remove_image() {
    echo -e "${YELLOW}🗑️ Removing image...${NC}"
    docker rmi $IMAGE_NAME > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Image removed!${NC}"
}

# Main script logic
case "${1:-deploy}" in
    "build")
        check_docker
        build_image
        ;;
    "deploy")
        check_docker
        build_image
        cleanup_container
        run_container
        show_status
        ;;
    "start")
        check_docker
        cleanup_container
        run_container
        show_status
        ;;
    "stop")
        stop_container
        ;;
    "restart")
        check_docker
        cleanup_container
        run_container
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "clean")
        remove_container
        remove_image
        ;;
    "help"|"-h"|"--help")
        echo -e "${GREEN}Usage: $0 [command]${NC}"
        echo ""
        echo "Commands:"
        echo "  build     - Build the Docker image"
        echo "  deploy    - Build and start the container (default)"
        echo "  start     - Start the container (assumes image exists)"
        echo "  stop      - Stop the container"
        echo "  restart   - Restart the container"
        echo "  status    - Show container status"
        echo "  logs      - Show container logs"
        echo "  clean     - Remove container and image"
        echo "  help      - Show this help message"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
