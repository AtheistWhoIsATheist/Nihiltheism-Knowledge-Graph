# AI Brain Quick Start Guide

## Installation

### Backend Setup
```bash
cd Nihiltheism-Knowledge-Graph
uv pip install -r requirements.txt
```

### Frontend Setup
```bash
cd Nihiltheism-Knowledge-Graph
npm install
```

## Running the Application

### Start Backend Server
```bash
python3 main.py
```
Server will run on http://localhost:5000

### Start Frontend (Development)
```bash
npm run dev
```
Frontend will run on http://localhost:5173

### Build Frontend (Production)
```bash
npm run build
# Built files will be in dist/ and copied to static/
```

## Using the AI Brain

1. **Open the Application**
   - Navigate to http://localhost:5173 (dev) or http://localhost:5000 (production)

2. **Access AI Brain**
   - Click the "AI Brain" button in the top-right header
   - A chat panel will appear on the right side

3. **Quick Actions**
   - **Brainstorm**: Generate new philosophical concepts
   - **Organize**: Get suggestions for graph organization
   - **Analyze**: Analyze philosophical relationships
   - **Expand**: Expand concepts in depth

4. **Chat with AI Brain**
   - Type your message in the input box
   - Press Enter to send (Shift+Enter for new line)
   - AI Brain will respond with suggestions and insights

5. **Accept Suggestions**
   - Click the + button on any suggestion
   - The concept/connection will be added to your graph
   - Changes are immediately reflected in the visualization

## Example Conversations

### Brainstorming
```
You: "Brainstorm concepts related to existential dread"
AI Brain: [Suggests related philosophical concepts with descriptions]
```

### Organizing
```
You: "How can I organize the current graph better?"
AI Brain: [Analyzes structure and suggests improvements]
```

### Analysis
```
You: "Analyze the concept of nihiltheism"
AI Brain: [Provides philosophical analysis and context]
```

### Expansion
```
You: "Expand the void concept"
AI Brain: [Suggests sub-concepts and relationships]
```

## REST API Usage

### Create Session
```bash
curl -X POST http://localhost:5000/api/brain/session \
  -H "Content-Type: application/json"
```

### Send Message
```bash
curl -X POST http://localhost:5000/api/brain/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "your-session-id",
    "message": "Brainstorm concepts about anxiety",
    "graph_data": {...}
  }'
```

### Get Context
```bash
curl http://localhost:5000/api/brain/context/your-session-id
```

## Troubleshooting

### Backend Issues
- **Flask not installed**: Run `pip install -r requirements.txt`
- **Port 5000 in use**: Change port in main.py
- **Import errors**: Ensure you're in the project directory

### Frontend Issues
- **Vite not found**: Run `npm install`
- **Port 5173 in use**: Vite will automatically use next available port
- **Build errors**: Check that all files are in correct directories

### Connection Issues
- **Cannot connect to backend**: Ensure Flask server is running
- **CORS errors**: Check CORS configuration in main.py
- **WebSocket errors**: Ensure Flask-SocketIO is installed

## Features

- **Conversational Interface**: Natural language interaction
- **Context Awareness**: Remembers conversation history
- **Graph Integration**: Direct updates to knowledge graph
- **Real-time Suggestions**: Immediate feedback and suggestions
- **Quality Tracking**: All AI content tracked with provenance
- **Multiple Modes**: 8 different capability modes

## Support

For issues or questions:
- Check IMPLEMENTATION_SUMMARY.md for detailed info
- Review AI_BRAIN_DOCUMENTATION.md for API reference
- Inspect browser console for frontend errors
- Check Flask logs for backend errors
