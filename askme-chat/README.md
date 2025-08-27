# AskMe Chat Application

A modern Angular chat application with real-time streaming responses using Angular Signals and zoneless change detection.

## Features

- **Real-time Streaming**: Live streaming responses from the AI backend
- **Session Management**: Automatic session ID generation for conversation continuity
- **Modern Angular**: Built with Angular 20+ using standalone components and signals
- **Responsive Design**: Modern UI with Tailwind CSS and Angular Material
- **Error Handling**: Graceful error handling with user-friendly messages
- **Zoneless**: Optimized for performance with zoneless change detection

## Architecture

### Components
- **Chat Component**: Main chat interface with streaming functionality
- **Header Component**: Application header
- **Menu Bar Component**: Navigation menu

### Services
- **ChatService**: Handles API communication and session management

### Key Technologies
- Angular 20+ with standalone components
- Angular Signals for reactive state management
- Angular Material for UI components
- Tailwind CSS for styling
- Fetch API for streaming responses

## API Integration

The application connects to the streaming endpoint:
```
POST http://10.10.30.185:8000/api/suggest_catalog_stream
```

### Request Format
```json
{
  "SessionID": "uuid-string",
  "UserPrompt": "user message"
}
```

### Response Format
The API returns streaming responses in one of these formats:

1. **Server-Sent Events (SSE)**:
   ```
   data: {"content": "partial response", "done": false}
   data: {"content": "more content", "done": false}
   data: {"content": "final content", "done": true}
   data: [DONE]
   ```

2. **Direct JSON**:
   ```json
   {"content": "partial response", "done": false}
   {"content": "more content", "done": false}
   {"content": "final content", "done": true}
   ```

## Session Management

- Session IDs are automatically generated when the application loads
- Each page refresh creates a new session
- Session ID is included in all API requests for conversation continuity

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Development Server
The application runs on `http://localhost:4200` by default.

## Docker Deployment

### Quick Start
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the deployment script
chmod +x deploy.sh
./deploy.sh deploy
```

### Manual Docker Commands
```bash
# Build the image
docker build -t askme-chat .

# Run the container
docker run -d -p 80:80 --name askme-chat-container askme-chat
```

### Deployment Script Commands
```bash
./deploy.sh build      # Build the Docker image
./deploy.sh deploy     # Build and start the container
./deploy.sh start      # Start existing container
./deploy.sh stop       # Stop the container
./deploy.sh restart    # Restart the container
./deploy.sh status     # Check container status
./deploy.sh logs       # View container logs
./deploy.sh clean      # Remove container and image
```

## Production Configuration

### Environment Variables
- `NODE_ENV=production`: Set for production builds

### Nginx Configuration
The Docker setup includes an optimized nginx configuration with:
- Gzip compression
- Static asset caching
- Security headers
- Angular routing support
- Health check endpoint at `/health`

### Health Checks
The container includes health checks that monitor the application status:
```bash
curl http://localhost/health
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the backend allows requests from your domain
2. **Streaming Not Working**: Check that the backend endpoint is accessible and returns proper streaming responses
3. **Session Issues**: Verify that session IDs are being generated and sent correctly

### Debug Mode
Enable debug logging by checking the browser console for:
- Session ID generation
- API request/response logs
- Streaming data parsing

### Network Issues
If the backend is not accessible:
1. Verify the endpoint URL is correct
2. Check network connectivity
3. Ensure the backend service is running
4. Verify firewall settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
