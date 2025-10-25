"""
AI Brain Core Module
Central orchestrating intelligence for the Nihiltheism Knowledge Graph
Provides conversational interface for organizing, brainstorming, writing, and philosophical reasoning
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import re
import json

from .context_manager import ConversationContext, context_store
from .provenance_tracker import (
    provenance_tracker, 
    ProvenanceType, 
    QualityLevel
)


class AIBrain:
    """
    Central AI Brain for philosophical knowledge graph management
    Provides conversational interface and orchestrates all AI operations
    """
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.context = context_store.get_or_create_context(session_id)
        self.capabilities = [
            'philosophical_analysis',
            'concept_extraction',
            'relationship_inference',
            'graph_organization',
            'brainstorming',
            'writing_assistance',
            'quality_assessment'
        ]
        
        # Initialize with system message
        if not self.context.messages:
            self.context.add_message(
                'system',
                "You are the AI Brain for the Nihiltheism Interactive Knowledge Graph. "
                "I can help you organize concepts, brainstorm ideas, analyze philosophical "
                "relationships, and expand your understanding of nihiltheistic thought."
            )
    
    def process_message(
        self,
        user_message: str,
        graph_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate response
        This is the main conversational interface
        """
        # Add user message to context
        self.context.add_message('user', user_message)
        
        # Capture graph state if provided
        if graph_data:
            self.context.add_graph_snapshot(graph_data, 'user_query')
        
        # Analyze user intent
        intent = self._analyze_intent(user_message)
        
        # Generate response based on intent
        response = self._generate_response(intent, user_message, graph_data)
        
        # Add assistant response to context
        self.context.add_message(
            'assistant',
            response['message'],
            metadata={'intent': intent}
        )
        
        # Track provenance for any generated content
        if response.get('suggestions'):
            self._track_suggestions_provenance(response['suggestions'])
        
        return response
    
    def _analyze_intent(self, message: str) -> str:
        """Analyze user intent from message"""
        message_lower = message.lower()
        
        # Intent patterns
        intent_patterns = {
            'brainstorm': ['brainstorm', 'ideas', 'suggest concepts', 'what about', 'could we'],
            'organize': ['organize', 'structure', 'categorize', 'arrange', 'group'],
            'analyze': ['analyze', 'explain', 'what is', 'tell me about', 'describe'],
            'expand': ['expand', 'grow', 'add more', 'elaborate', 'develop'],
            'connect': ['connect', 'relate', 'link', 'relationship', 'how does'],
            'write': ['write', 'compose', 'create text', 'draft', 'describe'],
            'evaluate': ['evaluate', 'assess', 'quality', 'rate', 'review'],
            'search': ['find', 'search', 'look for', 'locate', 'show me']
        }
        
        for intent, keywords in intent_patterns.items():
            if any(keyword in message_lower for keyword in keywords):
                return intent
        
        return 'general'
    
    def _generate_response(
        self,
        intent: str,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate response based on intent"""
        
        handlers = {
            'brainstorm': self._handle_brainstorm,
            'organize': self._handle_organize,
            'analyze': self._handle_analyze,
            'expand': self._handle_expand,
            'connect': self._handle_connect,
            'write': self._handle_write,
            'evaluate': self._handle_evaluate,
            'search': self._handle_search,
            'general': self._handle_general
        }
        
        handler = handlers.get(intent, self._handle_general)
        return handler(message, graph_data)
    
    def _handle_brainstorm(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle brainstorming requests"""
        
        # Extract topic from message
        topic = self._extract_topic(message)
        
        # Generate philosophical concepts related to topic
        suggestions = self._brainstorm_concepts(topic, graph_data)
        
        return {
            'intent': 'brainstorm',
            'message': f"I've brainstormed several philosophical concepts related to '{topic}'. "
                      f"These concepts draw from existential philosophy, nihilistic thought, and "
                      f"theological frameworks. Would you like me to elaborate on any of these?",
            'suggestions': suggestions,
            'topic': topic,
            'actions': ['add_concepts', 'elaborate', 'refine']
        }
    
    def _handle_organize(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle organization requests"""
        
        if not graph_data:
            return {
                'intent': 'organize',
                'message': "I'd be happy to help organize the graph, but I need the current "
                          "graph data to analyze structure and suggest improvements.",
                'suggestions': [],
                'actions': ['provide_graph_data']
            }
        
        # Analyze graph structure
        analysis = self._analyze_graph_structure(graph_data)
        
        # Generate organization suggestions
        suggestions = self._generate_organization_suggestions(analysis)
        
        return {
            'intent': 'organize',
            'message': f"I've analyzed the graph structure. It has {analysis['node_count']} nodes "
                      f"organized into {len(analysis['categories'])} categories. I have several "
                      f"suggestions to improve organization and clarity.",
            'suggestions': suggestions,
            'analysis': analysis,
            'actions': ['apply_organization', 'view_structure', 'refine']
        }
    
    def _handle_analyze(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle analysis requests"""
        
        # Extract what to analyze
        subject = self._extract_subject(message)
        
        # Generate philosophical analysis
        analysis = self._generate_philosophical_analysis(subject, graph_data)
        
        return {
            'intent': 'analyze',
            'message': analysis['explanation'],
            'analysis': analysis,
            'suggestions': analysis.get('related_concepts', []),
            'actions': ['deep_dive', 'add_concepts', 'explore_connections']
        }
    
    def _handle_expand(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle expansion requests"""
        
        # Extract what to expand
        target = self._extract_expansion_target(message, graph_data)
        
        # Generate expansion suggestions
        suggestions = self._generate_expansion_suggestions(target, graph_data)
        
        return {
            'intent': 'expand',
            'message': f"I can expand '{target}' by adding related philosophical concepts, "
                      f"exploring sub-themes, and identifying key relationships. "
                      f"Here are my top suggestions:",
            'suggestions': suggestions,
            'target': target,
            'actions': ['apply_expansion', 'customize_depth', 'select_direction']
        }
    
    def _handle_connect(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle connection/relationship requests"""
        
        # Extract concepts to connect
        concepts = self._extract_concepts_from_message(message)
        
        # Generate relationship suggestions
        relationships = self._infer_relationships(concepts, graph_data)
        
        return {
            'intent': 'connect',
            'message': f"I've analyzed potential relationships between {', '.join(concepts[:3])}. "
                      f"Here are the philosophical connections I've identified:",
            'suggestions': relationships,
            'concepts': concepts,
            'actions': ['add_connections', 'explain_relationship', 'find_more']
        }
    
    def _handle_write(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle writing assistance requests"""
        
        # Extract what to write about
        topic = self._extract_topic(message)
        
        # Generate philosophical writing
        writing = self._generate_philosophical_writing(topic, graph_data)
        
        return {
            'intent': 'write',
            'message': writing['content'],
            'writing': writing,
            'suggestions': writing.get('concepts_to_add', []),
            'actions': ['refine_writing', 'add_concepts', 'expand_section']
        }
    
    def _handle_evaluate(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle evaluation/quality assessment requests"""
        
        if not graph_data:
            return {
                'intent': 'evaluate',
                'message': "I need the graph data to evaluate quality and completeness.",
                'suggestions': [],
                'actions': ['provide_graph_data']
            }
        
        # Evaluate graph quality
        evaluation = self._evaluate_graph_quality(graph_data)
        
        return {
            'intent': 'evaluate',
            'message': evaluation['summary'],
            'evaluation': evaluation,
            'suggestions': evaluation['improvements'],
            'actions': ['apply_improvements', 'detailed_report', 'fix_issues']
        }
    
    def _handle_search(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle search requests"""
        
        # Extract search query
        query = self._extract_search_query(message)
        
        # Search graph
        results = self._search_graph(query, graph_data)
        
        return {
            'intent': 'search',
            'message': f"I found {len(results)} results for '{query}':",
            'results': results,
            'query': query,
            'actions': ['view_details', 'expand_results', 'refine_search']
        }
    
    def _handle_general(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle general conversation"""
        
        return {
            'intent': 'general',
            'message': "I'm here to help you explore and expand the Nihiltheism knowledge graph. "
                      "I can help you brainstorm concepts, organize ideas, analyze philosophical "
                      "relationships, expand the graph, evaluate quality, and more. "
                      "What would you like to work on?",
            'suggestions': self._get_general_suggestions(graph_data),
            'actions': ['brainstorm', 'organize', 'analyze', 'expand']
        }
    
    # Helper methods for content generation
    
    def _extract_topic(self, message: str) -> str:
        """Extract main topic from message"""
        # Simple extraction - in production, use NLP
        words = message.split()
        # Skip common words and find philosophical terms
        philosophical_terms = [
            'nihiltheism', 'existential', 'anxiety', 'void', 'nothingness',
            'transcendence', 'meaninglessness', 'despair', 'absurd', 'divine',
            'nietzsche', 'heidegger', 'cioran', 'suffering', 'death'
        ]
        
        for word in words:
            if word.lower() in philosophical_terms:
                return word.lower()
        
        return 'philosophical concepts'
    
    def _extract_subject(self, message: str) -> str:
        """Extract subject to analyze"""
        # Look for patterns like "analyze X" or "what is X"
        patterns = [
            r'analyze\s+(\w+)',
            r'what is\s+(\w+)',
            r'tell me about\s+(\w+)',
            r'explain\s+(\w+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return 'this concept'
    
    def _extract_expansion_target(
        self,
        message: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> str:
        """Extract what to expand"""
        # Look for node names or concepts in message
        if graph_data:
            for node in graph_data.get('nodes', []):
                if node['label'].lower() in message.lower():
                    return node['label']
        
        return 'the graph'
    
    def _extract_concepts_from_message(self, message: str) -> List[str]:
        """Extract philosophical concepts from message"""
        # Simple word extraction - in production, use NER
        words = message.split()
        concepts = []
        
        # Capture capitalized words and known philosophical terms
        for word in words:
            cleaned = word.strip('.,!?;:')
            if cleaned and (cleaned[0].isupper() or len(cleaned) > 8):
                concepts.append(cleaned)
        
        return concepts[:5]  # Return up to 5 concepts
    
    def _extract_search_query(self, message: str) -> str:
        """Extract search query from message"""
        # Look for patterns like "find X" or "search for X"
        patterns = [
            r'find\s+(.+)',
            r'search\s+(?:for\s+)?(.+)',
            r'look for\s+(.+)',
            r'show me\s+(.+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip('.,!?;:')
        
        return message
    
    def _brainstorm_concepts(
        self,
        topic: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Brainstorm philosophical concepts related to topic"""
        
        # Philosophical concept templates
        concept_templates = [
            {
                'label': f'Existential Dimensions of {topic.title()}',
                'description': f'Exploring the existential implications and phenomenological aspects of {topic} within nihiltheistic thought.',
                'category': 'sub_concept',
                'confidence': 0.85
            },
            {
                'label': f'{topic.title()} and the Void',
                'description': f'The relationship between {topic} and the fundamental void of meaninglessness in nihiltheistic philosophy.',
                'category': 'sub_concept',
                'confidence': 0.80
            },
            {
                'label': f'Transcendent {topic.title()}',
                'description': f'How {topic} manifests as both immanent experience and transcendent reality.',
                'category': 'sub_concept',
                'confidence': 0.75
            }
        ]
        
        return [{
            'type': 'node',
            'label': concept['label'],
            'description': concept['description'],
            'category': concept['category'],
            'relevance_score': concept['confidence'],
            'reasoning': f'Generated through philosophical brainstorming about {topic}'
        } for concept in concept_templates]
    
    def _analyze_graph_structure(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze graph structure"""
        nodes = graph_data.get('nodes', [])
        links = graph_data.get('links', [])
        
        # Count by category
        categories = {}
        for node in nodes:
            cat = node.get('category', 'unknown')
            categories[cat] = categories.get(cat, 0) + 1
        
        # Calculate connectivity
        node_connections = {}
        for link in links:
            source = link['source']
            target = link['target']
            node_connections[source] = node_connections.get(source, 0) + 1
            node_connections[target] = node_connections.get(target, 0) + 1
        
        avg_connections = sum(node_connections.values()) / len(node_connections) if node_connections else 0
        
        return {
            'node_count': len(nodes),
            'edge_count': len(links),
            'categories': categories,
            'avg_connections': avg_connections,
            'isolated_nodes': [
                node['id'] for node in nodes 
                if node['id'] not in node_connections
            ]
        }
    
    def _generate_organization_suggestions(
        self,
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for better organization"""
        suggestions = []
        
        # Suggest connecting isolated nodes
        if analysis['isolated_nodes']:
            suggestions.append({
                'type': 'organization',
                'action': 'connect_isolated',
                'description': f"Connect {len(analysis['isolated_nodes'])} isolated nodes to improve graph coherence",
                'details': {
                    'isolated_count': len(analysis['isolated_nodes']),
                    'nodes': analysis['isolated_nodes'][:5]
                }
            })
        
        # Suggest category balancing
        if analysis['categories']:
            max_cat = max(analysis['categories'].values())
            min_cat = min(analysis['categories'].values())
            if max_cat > min_cat * 3:
                suggestions.append({
                    'type': 'organization',
                    'action': 'balance_categories',
                    'description': 'Balance node distribution across categories for better structure',
                    'details': {'categories': analysis['categories']}
                })
        
        return suggestions
    
    def _generate_philosophical_analysis(
        self,
        subject: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate philosophical analysis of a subject"""
        
        analysis_text = (
            f"In nihiltheistic thought, {subject} represents a fundamental tension between "
            f"the recognition of meaninglessness and the acknowledgment of transcendent reality. "
            f"This concept emerges from the intersection of nihilistic void and theistic presence, "
            f"creating a paradoxical framework that challenges conventional philosophical boundaries."
        )
        
        return {
            'subject': subject,
            'explanation': analysis_text,
            'key_themes': ['meaninglessness', 'transcendence', 'paradox', 'void'],
            'related_concepts': self._find_related_concepts(subject, graph_data),
            'philosophical_lineage': ['Nietzsche', 'Heidegger', 'Cioran']
        }
    
    def _generate_expansion_suggestions(
        self,
        target: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for expanding a concept"""
        return [
            {
                'type': 'node',
                'label': f'Phenomenological Aspects of {target}',
                'description': f'The lived experience and subjective dimensions of {target}',
                'category': 'sub_concept',
                'relevance_score': 0.80,
                'reasoning': f'Expanding {target} through phenomenological analysis'
            },
            {
                'type': 'connection',
                'source': target,
                'target': 'existential-anxiety',
                'relationship': 'explores',
                'relevance_score': 0.75,
                'reasoning': f'{target} naturally connects to existential anxiety themes'
            }
        ]
    
    def _infer_relationships(
        self,
        concepts: List[str],
        graph_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Infer philosophical relationships between concepts"""
        relationships = []
        
        if len(concepts) >= 2:
            relationships.append({
                'type': 'connection',
                'source': concepts[0],
                'target': concepts[1],
                'relationship': 'explores',
                'relevance_score': 0.70,
                'reasoning': f'{concepts[0]} and {concepts[1]} share thematic resonance in nihiltheistic thought'
            })
        
        return relationships
    
    def _generate_philosophical_writing(
        self,
        topic: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate philosophical writing about a topic"""
        
        content = (
            f"**{topic.title()} in Nihiltheistic Philosophy**\n\n"
            f"The concept of {topic} occupies a crucial position within the nihiltheistic framework. "
            f"It represents not merely an abstract philosophical notion, but a lived reality that "
            f"confronts the fundamental tension between meaning and meaninglessness. "
            f"\n\n"
            f"Through the lens of nihiltheism, {topic} emerges as both destroyer and creator—"
            f"destroying conventional certainties while creating space for authentic encounter "
            f"with the void. This paradoxical nature reflects the core nihiltheistic insight: "
            f"that the divine and the nothing are not opposites, but complementary aspects of "
            f"ultimate reality."
        )
        
        return {
            'topic': topic,
            'content': content,
            'word_count': len(content.split()),
            'concepts_to_add': [
                {'label': f'{topic.title()} Paradox', 'relevance': 0.85},
                {'label': f'Authentic {topic.title()}', 'relevance': 0.80}
            ]
        }
    
    def _evaluate_graph_quality(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate overall graph quality"""
        
        analysis = self._analyze_graph_structure(graph_data)
        
        # Calculate quality score
        quality_score = 0.0
        issues = []
        strengths = []
        
        # Check connectivity
        if analysis['avg_connections'] >= 2:
            quality_score += 0.3
            strengths.append('Good average connectivity')
        else:
            issues.append('Low average connectivity - consider adding more relationships')
        
        # Check isolated nodes
        if len(analysis['isolated_nodes']) == 0:
            quality_score += 0.2
            strengths.append('No isolated nodes')
        else:
            issues.append(f"{len(analysis['isolated_nodes'])} isolated nodes need connections")
        
        # Check category distribution
        if len(analysis['categories']) >= 3:
            quality_score += 0.2
            strengths.append('Good category diversity')
        
        # Check size
        if analysis['node_count'] >= 10:
            quality_score += 0.3
            strengths.append('Substantial content')
        
        return {
            'quality_score': min(quality_score, 1.0),
            'summary': f"Graph quality score: {int(quality_score * 100)}%. "
                      f"The graph has {len(strengths)} strengths and {len(issues)} areas for improvement.",
            'strengths': strengths,
            'issues': issues,
            'improvements': self._generate_organization_suggestions(analysis)
        }
    
    def _search_graph(
        self,
        query: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Search graph for matching nodes"""
        if not graph_data:
            return []
        
        results = []
        query_lower = query.lower()
        
        for node in graph_data.get('nodes', []):
            if (query_lower in node.get('label', '').lower() or
                query_lower in node.get('description', '').lower()):
                results.append({
                    'id': node['id'],
                    'label': node['label'],
                    'description': node.get('description', ''),
                    'category': node.get('category', '')
                })
        
        return results
    
    def _find_related_concepts(
        self,
        subject: str,
        graph_data: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Find concepts related to subject in graph"""
        if not graph_data:
            return []
        
        related = []
        subject_lower = subject.lower()
        
        for node in graph_data.get('nodes', []):
            label_lower = node.get('label', '').lower()
            if subject_lower in label_lower or label_lower in subject_lower:
                related.append(node['label'])
        
        return related[:5]
    
    def _get_general_suggestions(
        self,
        graph_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Get general suggestions for next actions"""
        return [
            {
                'action': 'brainstorm',
                'description': 'Brainstorm new philosophical concepts to add',
                'icon': 'lightbulb'
            },
            {
                'action': 'organize',
                'description': 'Organize and structure the current graph',
                'icon': 'layout'
            },
            {
                'action': 'expand',
                'description': 'Expand an existing concept in depth',
                'icon': 'expand'
            }
        ]
    
    def _track_suggestions_provenance(self, suggestions: List[Dict[str, Any]]):
        """Track provenance for generated suggestions"""
        for suggestion in suggestions:
            if suggestion.get('type') == 'node':
                content_id = suggestion.get('label', '').lower().replace(' ', '-')
                provenance_tracker.track_ai_content(
                    content_id,
                    'suggestion',
                    'AI Brain v1.0',
                    suggestion.get('relevance_score', 0.7),
                    suggestion.get('reasoning', 'Generated by AI Brain')
                )
    
    # Public API methods
    
    def get_context_summary(self) -> Dict[str, Any]:
        """Get conversation context summary"""
        return self.context.get_conversation_summary()
    
    def get_capabilities(self) -> List[str]:
        """Get AI Brain capabilities"""
        return self.capabilities
    
    def clear_context(self):
        """Clear conversation context"""
        self.context.clear_context()
    
    def get_provenance_stats(self) -> Dict[str, Any]:
        """Get provenance tracking statistics"""
        return provenance_tracker.get_stats()


def create_ai_brain(session_id: str) -> AIBrain:
    """Factory function to create AI Brain instance"""
    return AIBrain(session_id)
