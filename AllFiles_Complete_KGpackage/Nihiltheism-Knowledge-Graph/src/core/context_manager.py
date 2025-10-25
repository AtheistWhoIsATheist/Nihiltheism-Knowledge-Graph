"""
Context Manager for AI Brain
Manages conversation history, graph state context, and philosophical reasoning context
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
import json


class ConversationContext:
    """Manages conversation history and context for AI Brain"""
    
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self.messages: List[Dict[str, Any]] = []
        self.graph_state_snapshots: List[Dict[str, Any]] = []
        self.active_operations: List[Dict[str, Any]] = []
        self.metadata: Dict[str, Any] = {
            'session_id': None,
            'created_at': datetime.now().isoformat(),
            'last_updated': datetime.now().isoformat()
        }
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """Add a message to conversation history"""
        message = {
            'role': role,  # 'user', 'assistant', 'system'
            'content': content,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        self.messages.append(message)
        
        # Maintain max history limit
        if len(self.messages) > self.max_history:
            self.messages = self.messages[-self.max_history:]
        
        self.metadata['last_updated'] = datetime.now().isoformat()
    
    def add_graph_snapshot(self, graph_data: Dict[str, Any], operation: str):
        """Capture graph state at a point in time"""
        snapshot = {
            'timestamp': datetime.now().isoformat(),
            'operation': operation,
            'node_count': len(graph_data.get('nodes', [])),
            'edge_count': len(graph_data.get('links', [])),
            'nodes': [node['id'] for node in graph_data.get('nodes', [])],
            'recent_changes': self._detect_changes(graph_data)
        }
        
        self.graph_state_snapshots.append(snapshot)
        
        # Keep only last 10 snapshots
        if len(self.graph_state_snapshots) > 10:
            self.graph_state_snapshots = self.graph_state_snapshots[-10:]
    
    def _detect_changes(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect what changed in the graph"""
        if not self.graph_state_snapshots:
            return {'type': 'initial_state'}
        
        last_snapshot = self.graph_state_snapshots[-1]
        current_nodes = set(node['id'] for node in graph_data.get('nodes', []))
        last_nodes = set(last_snapshot['nodes'])
        
        return {
            'added_nodes': list(current_nodes - last_nodes),
            'removed_nodes': list(last_nodes - current_nodes),
            'node_count_delta': len(current_nodes) - len(last_nodes)
        }
    
    def track_operation(self, operation_type: str, details: Dict[str, Any]):
        """Track an ongoing operation"""
        operation = {
            'type': operation_type,
            'details': details,
            'status': 'active',
            'started_at': datetime.now().isoformat()
        }
        
        self.active_operations.append(operation)
    
    def complete_operation(self, operation_type: str, result: Dict[str, Any]):
        """Mark an operation as complete"""
        for op in self.active_operations:
            if op['type'] == operation_type and op['status'] == 'active':
                op['status'] = 'completed'
                op['completed_at'] = datetime.now().isoformat()
                op['result'] = result
                break
    
    def get_recent_context(self, message_count: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation context"""
        return self.messages[-message_count:]
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get a summary of the conversation"""
        return {
            'message_count': len(self.messages),
            'session_duration': self._calculate_duration(),
            'topics_discussed': self._extract_topics(),
            'operations_performed': len(self.active_operations),
            'graph_snapshots': len(self.graph_state_snapshots)
        }
    
    def _calculate_duration(self) -> str:
        """Calculate session duration"""
        if not self.messages:
            return "0 minutes"
        
        start = datetime.fromisoformat(self.messages[0]['timestamp'])
        end = datetime.fromisoformat(self.messages[-1]['timestamp'])
        duration = (end - start).total_seconds() / 60
        
        return f"{int(duration)} minutes"
    
    def _extract_topics(self) -> List[str]:
        """Extract main topics from conversation"""
        # Simple keyword extraction - in production, use NLP
        philosophical_keywords = [
            'nihiltheism', 'existential', 'anxiety', 'void', 'nothingness',
            'transcendence', 'meaninglessness', 'despair', 'absurd', 'divine'
        ]
        
        topics = set()
        for message in self.messages:
            content_lower = message['content'].lower()
            for keyword in philosophical_keywords:
                if keyword in content_lower:
                    topics.add(keyword)
        
        return list(topics)
    
    def clear_context(self):
        """Clear conversation context"""
        self.messages.clear()
        self.graph_state_snapshots.clear()
        self.active_operations.clear()
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize context to dictionary"""
        return {
            'metadata': self.metadata,
            'messages': self.messages,
            'graph_snapshots': self.graph_state_snapshots,
            'active_operations': self.active_operations,
            'summary': self.get_conversation_summary()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationContext':
        """Deserialize context from dictionary"""
        context = cls()
        context.metadata = data.get('metadata', {})
        context.messages = data.get('messages', [])
        context.graph_state_snapshots = data.get('graph_snapshots', [])
        context.active_operations = data.get('active_operations', [])
        return context


class ContextStore:
    """Store and manage multiple conversation contexts"""
    
    def __init__(self):
        self.contexts: Dict[str, ConversationContext] = {}
    
    def create_context(self, session_id: str) -> ConversationContext:
        """Create a new conversation context"""
        context = ConversationContext()
        context.metadata['session_id'] = session_id
        self.contexts[session_id] = context
        return context
    
    def get_context(self, session_id: str) -> Optional[ConversationContext]:
        """Get existing context"""
        return self.contexts.get(session_id)
    
    def get_or_create_context(self, session_id: str) -> ConversationContext:
        """Get existing or create new context"""
        if session_id not in self.contexts:
            return self.create_context(session_id)
        return self.contexts[session_id]
    
    def delete_context(self, session_id: str) -> bool:
        """Delete a context"""
        if session_id in self.contexts:
            del self.contexts[session_id]
            return True
        return False
    
    def list_contexts(self) -> List[str]:
        """List all session IDs"""
        return list(self.contexts.keys())


# Global context store instance
context_store = ContextStore()
