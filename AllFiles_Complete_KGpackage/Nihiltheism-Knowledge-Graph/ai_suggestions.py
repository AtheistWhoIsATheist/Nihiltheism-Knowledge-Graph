from flask import Blueprint, request, jsonify
import json
import re
from typing import List, Dict, Any

ai_bp = Blueprint('ai_suggestions', __name__)

# Load the original Nihiltheism text for analysis
NIHILTHEISM_TEXT = """
Nihiltheism represents a philosophical synthesis that transcends traditional nihilism by incorporating theistic elements while maintaining the fundamental recognition of meaninglessness. This paradoxical framework suggests that the divine and the void are not mutually exclusive but rather complementary aspects of ultimate reality.

The core tenets include:
1. Recognition of existential meaninglessness as a fundamental truth
2. Acknowledgment of divine presence within the void
3. Transcendence through embracing both nothingness and the sacred
4. The dissolution of ego as a path to understanding
5. Apophatic theology as a means of approaching the ineffable

Key philosophical connections emerge with thinkers like Nietzsche, Heidegger, Cioran, and mystical traditions from both Eastern and Western thought. The framework challenges conventional religious and atheistic perspectives by proposing a third way that honors both the absence and presence of meaning.

Nihiltheism explores themes of:
- Existential dread and its transformation
- The relationship between suffering and transcendence
- Rational responses to meaninglessness
- The role of despair in spiritual awakening
- Infinite nothingness as a form of divine experience
- The uncanny illusion of naturalism
- Material nightmares and their philosophical implications
- Suicide as a rational response to existence
- The goal of nihiltheism as ultimate liberation
- Profound sadness as a gateway to understanding
- Naturalistic contemplation and its limits
- Augmented nihilism through technological mediation
"""

class PhilosophicalAnalyzer:
    def __init__(self):
        self.philosophical_concepts = [
            "existential anxiety", "ontological uncertainty", "epistemic doubt", "moral relativism",
            "aesthetic nihilism", "cosmic horror", "temporal finitude", "death anxiety",
            "absurdist rebellion", "tragic optimism", "negative dialectics", "apophatic mysticism",
            "phenomenological reduction", "hermeneutic circle", "deconstructive reading",
            "postmodern condition", "hyperreality", "simulacra", "différance", "logocentrism",
            "will to power", "eternal recurrence", "amor fati", "übermensch", "ressentiment",
            "bad faith", "authentic existence", "thrownness", "being-toward-death", "anxiety",
            "care structure", "temporal ecstasies", "horizon of meaning", "life-world",
            "intersubjectivity", "embodied cognition", "lived experience", "intentionality",
            "bracketing", "natural attitude", "transcendental ego", "passive synthesis",
            "genetic phenomenology", "constitutional analysis", "eidetic reduction",
            "material a priori", "regional ontology", "fundamental ontology", "ontic-ontological difference"
        ]
        
        self.relationship_types = [
            "explores", "critiques", "leads to", "confronts", "reveals", "discusses",
            "prompts", "examines", "challenges", "transcends", "encompasses", "derives from",
            "contradicts", "synthesizes", "deconstructs", "reconstructs", "problematizes",
            "illuminates", "obscures", "transforms", "negates", "affirms", "questions",
            "presupposes", "implies", "entails", "grounds", "undermines", "supports"
        ]

    def analyze_graph_gaps(self, graph_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze the current graph to identify conceptual gaps and suggest new nodes."""
        existing_concepts = {node['label'].lower() for node in graph_data['nodes']}
        suggestions = []
        
        # Analyze missing core philosophical concepts
        for concept in self.philosophical_concepts:
            if concept.lower() not in existing_concepts:
                # Check if concept is related to existing nodes
                relevance_score = self._calculate_relevance(concept, existing_concepts)
                if relevance_score > 0.3:  # Threshold for relevance
                    suggestions.append({
                        'type': 'node',
                        'label': concept.title(),
                        'description': self._generate_description(concept),
                        'category': self._determine_category(concept),
                        'relevance_score': relevance_score,
                        'reasoning': self._explain_relevance(concept, existing_concepts)
                    })
        
        # Suggest connections between existing nodes
        connection_suggestions = self._suggest_connections(graph_data)
        suggestions.extend(connection_suggestions)
        
        # Sort by relevance score
        suggestions.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        return suggestions[:10]  # Return top 10 suggestions

    def _calculate_relevance(self, concept: str, existing_concepts: set) -> float:
        """Calculate how relevant a concept is to the existing graph."""
        concept_words = set(concept.lower().split())
        
        # Check for semantic overlap with existing concepts
        overlap_score = 0
        for existing in existing_concepts:
            existing_words = set(existing.split())
            intersection = concept_words.intersection(existing_words)
            if intersection:
                overlap_score += len(intersection) / max(len(concept_words), len(existing_words))
        
        # Boost score for nihiltheism-related concepts
        nihiltheism_keywords = ['nihil', 'void', 'nothing', 'existential', 'anxiety', 'dread', 'despair', 'meaningless']
        for keyword in nihiltheism_keywords:
            if keyword in concept.lower():
                overlap_score += 0.5
        
        return min(overlap_score, 1.0)

    def _generate_description(self, concept: str) -> str:
        """Generate a philosophical description for a concept."""
        descriptions = {
            "existential anxiety": "The profound unease arising from confronting one's existence, freedom, and mortality within an apparently meaningless universe.",
            "ontological uncertainty": "The fundamental doubt about the nature of being and reality, questioning what it means for something to exist.",
            "epistemic doubt": "Systematic questioning of the possibility and limits of knowledge, challenging the foundations of what we claim to know.",
            "moral relativism": "The view that ethical judgments are not absolutely true but relative to particular contexts, cultures, or individuals.",
            "aesthetic nihilism": "The position that aesthetic values and beauty have no objective foundation or ultimate meaning.",
            "cosmic horror": "The overwhelming dread that emerges from recognizing humanity's insignificance in an vast, indifferent universe.",
            "temporal finitude": "The recognition of time's limits and the bounded nature of human existence within the flow of temporality.",
            "death anxiety": "The existential fear and dread associated with the inevitability of death and non-existence.",
            "absurdist rebellion": "The defiant response to life's absurdity through continued engagement despite the absence of ultimate meaning.",
            "tragic optimism": "The paradoxical affirmation of life and meaning in full recognition of suffering and tragedy.",
            "negative dialectics": "A critical method that resists synthesis and maintains tension between opposing concepts.",
            "apophatic mysticism": "The mystical approach that emphasizes what cannot be said about the divine, proceeding through negation."
        }
        
        return descriptions.get(concept.lower(), f"A philosophical concept related to {concept} within the framework of nihiltheistic thought.")

    def _determine_category(self, concept: str) -> str:
        """Determine the appropriate category for a concept."""
        if any(word in concept.lower() for word in ['anxiety', 'dread', 'horror', 'despair', 'finitude', 'death']):
            return 'sub-concept'
        elif any(word in concept.lower() for word in ['nihil', 'void', 'nothing', 'meaningless', 'absurd']):
            return 'core'
        elif any(word in concept.lower() for word in ['mysticism', 'dialectics', 'phenomenology', 'ontology']):
            return 'sub-concept'
        else:
            return 'sub-concept'

    def _explain_relevance(self, concept: str, existing_concepts: set) -> str:
        """Explain why this concept is relevant to the existing graph."""
        related_concepts = []
        concept_words = set(concept.lower().split())
        
        for existing in existing_concepts:
            existing_words = set(existing.split())
            if concept_words.intersection(existing_words):
                related_concepts.append(existing)
        
        if related_concepts:
            return f"This concept relates to existing nodes: {', '.join(list(related_concepts)[:3])}. It would deepen the philosophical analysis by exploring {concept}."
        else:
            return f"This concept would expand the nihiltheistic framework by introducing {concept} as a key philosophical dimension."

    def _suggest_connections(self, graph_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Suggest new connections between existing nodes."""
        nodes = graph_data['nodes']
        existing_links = {(link['source'], link['target']) for link in graph_data['links']}
        suggestions = []
        
        # Suggest connections based on philosophical relationships
        for i, node1 in enumerate(nodes):
            for j, node2 in enumerate(nodes[i+1:], i+1):
                if (node1['id'], node2['id']) not in existing_links and (node2['id'], node1['id']) not in existing_links:
                    relationship = self._infer_relationship(node1, node2)
                    if relationship:
                        suggestions.append({
                            'type': 'connection',
                            'source': node1['id'],
                            'target': node2['id'],
                            'source_label': node1['label'],
                            'target_label': node2['label'],
                            'relationship': relationship['type'],
                            'relevance_score': relationship['score'],
                            'reasoning': relationship['reasoning']
                        })
        
        return suggestions

    def _infer_relationship(self, node1: Dict, node2: Dict) -> Dict[str, Any]:
        """Infer potential philosophical relationships between two nodes."""
        label1, label2 = node1['label'].lower(), node2['label'].lower()
        
        # Define relationship patterns
        patterns = [
            (['nihiltheism', 'nihil'], ['anxiety', 'dread', 'despair'], 'explores', 0.8, "Nihiltheism directly explores existential anxiety and dread"),
            (['nothingness', 'void'], ['anxiety', 'dread'], 'leads to', 0.7, "Confronting nothingness often leads to existential anxiety"),
            (['suicide', 'death'], ['rational', 'response'], 'examines', 0.6, "Examines suicide as a rational response to existence"),
            (['transcendent', 'divine'], ['immanent', 'material'], 'contradicts', 0.5, "Transcendent and immanent aspects create philosophical tension"),
            (['nietzsche', 'heidegger'], ['nihiltheism'], 'influences', 0.7, "These thinkers significantly influence nihiltheistic thought"),
            (['meaningless', 'absurd'], ['rational', 'response'], 'prompts', 0.6, "Meaninglessness prompts the search for rational responses")
        ]
        
        for pattern_words1, pattern_words2, relationship, score, reasoning in patterns:
            if (any(word in label1 for word in pattern_words1) and any(word in label2 for word in pattern_words2)) or \
               (any(word in label2 for word in pattern_words1) and any(word in label1 for word in pattern_words2)):
                return {
                    'type': relationship,
                    'score': score,
                    'reasoning': reasoning
                }
        
        return None

@ai_bp.route('/suggest', methods=['POST'])
def get_suggestions():
    """Get AI-powered suggestions for new nodes and connections."""
    try:
        data = request.get_json()
        graph_data = data.get('graphData', {})
        
        analyzer = PhilosophicalAnalyzer()
        suggestions = analyzer.analyze_graph_gaps(graph_data)
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'total': len(suggestions)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/analyze-text', methods=['POST'])
def analyze_text():
    """Analyze additional text to suggest new concepts."""
    try:
        data = request.get_json()
        text = data.get('text', '')
        graph_data = data.get('graphData', {})
        
        # Extract concepts from text using simple NLP
        concepts = extract_concepts_from_text(text)
        existing_concepts = {node['label'].lower() for node in graph_data.get('nodes', [])}
        
        new_concepts = []
        for concept in concepts:
            if concept.lower() not in existing_concepts:
                new_concepts.append({
                    'type': 'node',
                    'label': concept.title(),
                    'description': f"A concept extracted from the provided text: {concept}",
                    'category': 'sub-concept',
                    'relevance_score': 0.6,
                    'reasoning': f"This concept was identified in the provided text and relates to nihiltheistic themes."
                })
        
        return jsonify({
            'success': True,
            'suggestions': new_concepts[:5],  # Return top 5
            'total': len(new_concepts)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def extract_concepts_from_text(text: str) -> List[str]:
    """Extract philosophical concepts from text using pattern matching."""
    # Simple concept extraction - in a real implementation, this would use NLP libraries
    philosophical_patterns = [
        r'\b(?:existential|ontological|epistemic|phenomenological|hermeneutic)\s+\w+',
        r'\b\w+(?:ism|ology|ness|ity|tion)\b',
        r'\b(?:anxiety|dread|despair|anguish|suffering|pain|void|nothingness|meaninglessness)\b',
        r'\b(?:transcendence|immanence|divine|sacred|profane|secular)\b'
    ]
    
    concepts = set()
    for pattern in philosophical_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        concepts.update(matches)
    
    # Filter out common words and keep only meaningful concepts
    meaningful_concepts = []
    for concept in concepts:
        if len(concept) > 3 and concept.lower() not in ['this', 'that', 'with', 'from', 'they', 'them', 'have', 'been', 'were']:
            meaningful_concepts.append(concept)
    
    return list(meaningful_concepts)

