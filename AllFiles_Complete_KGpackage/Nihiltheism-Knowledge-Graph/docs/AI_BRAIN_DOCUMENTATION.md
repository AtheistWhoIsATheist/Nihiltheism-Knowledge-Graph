# AI Brain Core Module Documentation

## Overview

The AI Brain Core Module is a conversational AI system that serves as the central orchestrating intelligence for the Nihiltheism Interactive Knowledge Graph. It provides natural language interaction for organizing, brainstorming, writing, and philosophical reasoning.

## Architecture

### Core Components

1. **Context Manager** (`src/core/context_manager.py`)
   - Manages conversation history and context
   - Tracks graph state snapshots
   - Maintains active operations
   - Provides context summarization

2. **Provenance Tracker** (`src/core/provenance_tracker.py`)
   - Tracks origin and quality of all content
   - Supports multiple provenance types: AI-generated, user-created, collaborative
   - Quality levels: unverified, reviewed, validated, expert-approved
   - Maintains lineage and review history

3. **AI Brain** (`src/core/ai_brain.py`)
   - Main orchestration layer
   - Processes user messages and generates responses
   - Coordinates with existing AI components
   - Intent-based response generation

### API Endpoints

#### REST API

**Create Session**
```http
POST /api/brain/session
Response: { session_id, capabilities, message }
```

**Send Message**
```http
POST /api/brain/message
Body: { session_id, message, graph_data }
Response: { response, context_summary }
```

**Get Context**
```http
GET /api/brain/context/<session_id>
Response: { context }
```

**Clear Context**
```http
DELETE /api/brain/context/<session_id>
Response: { message }
```

**Get Provenance**
```http
GET /api/brain/provenance
Response: { stats }

GET /api/brain/provenance/<content_id>
Response: { provenance }
```

#### WebSocket API

**Connect**
```javascript
socket.connect('http://localhost:5000/ai_brain');
```

**Events**
- `connect` - Connection established
- `join_session` - Join AI Brain session
- `send_message` - Send message to AI Brain
- `message_response` - Receive AI Brain response
- `get_suggestions` - Request suggestions
- `suggestions_ready` - Suggestions available
- `track_action` - Track user action for provenance
- `ping/pong` - Connection health check

## Capabilities

The AI Brain supports multiple interaction modes:

1. **Brainstorming** - Generate new philosophical concepts
2. **Organization** - Structure and categorize the graph
3. **Analysis** - Provide philosophical analysis and insights
4. **Expansion** - Suggest ways to expand concepts
5. **Connection** - Infer relationships between concepts
6. **Writing** - Generate philosophical text
7. **Evaluation** - Assess graph quality
8. **Search** - Find concepts in the graph

## Integration with Existing Components

### GraphStore Integration
- AI Brain reads current graph state via `graphStore.toVisualizationFormat()`
- Suggestions can be applied directly to graph using `graphStore.dispatch()`
- Maintains backward compatibility with existing transaction system

### PhilosophicalAnalyzer Integration
- AI Brain can leverage existing PhilosophicalAnalyzer for concept analysis
- Coordinated approach to philosophical reasoning
- Shared philosophical knowledge base

### ExpansionController Integration
- AI Brain can trigger graph expansion via existing ExpansionController
- Unified approach to graph growth
- Coordinated job management

## Usage Examples

### Backend (Python)

```python
from src.core.ai_brain import create_ai_brain

# Create AI Brain instance
brain = create_ai_brain(session_id='user-123')

# Process message
response = brain.process_message(
    "Brainstorm concepts related to existential anxiety",
    graph_data=current_graph
)

# Get suggestions
suggestions = response['suggestions']

# Get context summary
summary = brain.get_context_summary()
```

### Frontend (React)

```javascript
import AIBrainChat from './components/AIBrainChat';

function App() {
  const [showAIBrain, setShowAIBrain] = useState(false);

  return (
    <div>
      <Button onClick={() => setShowAIBrain(true)}>
        Open AI Brain
      </Button>
      
      {showAIBrain && (
        <AIBrainChat onClose={() => setShowAIBrain(false)} />
      )}
    </div>
  );
}
```

### WebSocket (JavaScript)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  path: '/socket.io',
  transports: ['websocket']
});

socket.emit('join_session', { session_id: 'user-123' });

socket.on('message_response', (data) => {
  console.log('AI Brain response:', data.response);
});

socket.emit('send_message', {
  session_id: 'user-123',
  message: 'Analyze the graph structure',
  graph_data: graphData
});
```

## Provenance Tracking

All AI-generated content is tracked with provenance information:

```python
from src.core.provenance_tracker import provenance_tracker, ProvenanceType

# Track AI-generated content
record = provenance_tracker.track_ai_content(
    content_id='existential-anxiety-2',
    content_type='node',
    model='AI Brain v1.0',
    confidence=0.85,
    reasoning='Generated through philosophical analysis'
)

# Add review
record.add_review(
    reviewer='user-123',
    rating=5,
    notes='Excellent philosophical insight'
)

# Get quality score
quality = record.get_quality_score()  # 0.0 - 1.0
```

## Context Management

Conversation context is automatically managed:

```python
from src.core.context_manager import context_store

# Get context for session
context = context_store.get_context(session_id='user-123')

# Get recent messages
recent = context.get_recent_context(message_count=10)

# Get summary
summary = context.get_conversation_summary()
# Returns: { message_count, session_duration, topics_discussed, ... }

# Clear context
context.clear_context()
```

## Intent Recognition

The AI Brain recognizes user intent and responds appropriately:

- **Brainstorm**: "brainstorm", "ideas", "suggest concepts"
- **Organize**: "organize", "structure", "categorize"
- **Analyze**: "analyze", "explain", "what is"
- **Expand**: "expand", "grow", "add more"
- **Connect**: "connect", "relate", "link"
- **Write**: "write", "compose", "create text"
- **Evaluate**: "evaluate", "assess", "quality"
- **Search**: "find", "search", "look for"

## Quality Assurance

### Provenance Types
- **AI Generated**: Content created by AI Brain
- **User Created**: Content created directly by user
- **AI Suggested**: AI-suggested content pending user approval
- **Collaborative**: Joint AI-user creation
- **Imported**: Content from external sources

### Quality Levels
- **Unverified**: New content, not reviewed
- **Reviewed**: Reviewed by at least one user
- **Validated**: Multiple positive reviews
- **Expert Approved**: High-quality, expert-validated content

## Configuration

### Context Manager
```python
context = ConversationContext(max_history=50)
```

### AI Brain Capabilities
The AI Brain exposes its capabilities via:
```python
capabilities = brain.get_capabilities()
# Returns: ['philosophical_analysis', 'concept_extraction', ...]
```

## Error Handling

The AI Brain includes comprehensive error handling:

```python
try:
    response = brain.process_message(message, graph_data)
except Exception as e:
    # Handle error
    error_response = {
        'intent': 'error',
        'message': f'Error processing message: {str(e)}',
        'suggestions': []
    }
```

## Real-time Collaboration

WebSocket support enables real-time AI Brain collaboration:

- Multiple users can join the same session
- Real-time message broadcasting
- Live suggestion updates
- Shared context across users

## Backward Compatibility

The AI Brain maintains full backward compatibility:

- Existing AI Suggestions component continues to work
- GraphStore transactions remain unchanged
- ExpansionController integration is optional
- No breaking changes to existing APIs

## Performance Considerations

- Context history limited to 50 messages (configurable)
- Graph snapshots limited to 10 (automatic pruning)
- Suggestions limited to top 10 by relevance
- WebSocket connection pooling for scalability

## Future Enhancements

Potential future improvements:

1. Integration with external LLM APIs (OpenAI, Anthropic)
2. Vector embeddings for semantic search
3. Graph neural network analysis
4. Multi-language support
5. Voice interface
6. Collaborative editing with conflict resolution
7. Export conversation history
8. Advanced provenance visualization

## Testing

### Unit Tests
```bash
python -m pytest tests/test_ai_brain.py
python -m pytest tests/test_context_manager.py
python -m pytest tests/test_provenance_tracker.py
```

### Integration Tests
```bash
python -m pytest tests/integration/test_ai_brain_api.py
```

### Frontend Tests
```bash
npm test -- AIBrainChat.test.jsx
```

## Deployment

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask server with SocketIO
python main.py
```

### Frontend
```bash
# Install dependencies
npm install

# Build
npm run build

# Development
npm run dev
```

## Support

For issues or questions:
- Check existing issues in the repository
- Review documentation
- Contact the development team

## License

MIT License - See LICENSE file for details
