import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, BookOpen, Users, Quote, Lightbulb } from 'lucide-react';

const NodeDetailPanel = ({ node, onClose, graphData }) => {
  if (!node) return null;

  const getConnectedNodes = () => {
    const connections = [];
    graphData.links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      
      if (sourceId === node.id) {
        const targetNode = graphData.nodes.find(n => n.id === targetId);
        if (targetNode) {
          connections.push({ node: targetNode, relationship: link.relationship, direction: 'outgoing' });
        }
      } else if (targetId === node.id) {
        const sourceNode = graphData.nodes.find(n => n.id === sourceId);
        if (sourceNode) {
          connections.push({ node: sourceNode, relationship: link.relationship, direction: 'incoming' });
        }
      }
    });
    return connections;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'core':
        return <BookOpen className="w-4 h-4" />;
      case 'sub-concept':
        return <Lightbulb className="w-4 h-4" />;
      case 'thinker':
        return <Users className="w-4 h-4" />;
      case 'key-phrase':
        return <Quote className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'core':
        return 'Core Concept';
      case 'sub-concept':
        return 'Sub-Concept';
      case 'thinker':
        return 'Philosopher/Thinker';
      case 'key-phrase':
        return 'Key Phrase';
      default:
        return 'Concept';
    }
  };

  const connections = getConnectedNodes();

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg z-20 overflow-hidden">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(node.category)}
                <Badge variant="secondary">{getCategoryLabel(node.category)}</Badge>
              </div>
              <CardTitle className="text-lg leading-tight">{node.label}</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        
        <ScrollArea className="flex-1">
          <CardContent className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {node.description}
              </p>
            </div>

            {/* Connections */}
            {connections.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Connections ({connections.length})</h3>
                <div className="space-y-3">
                  {connections.map((connection, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-2 mb-1">
                        {getCategoryIcon(connection.node.category)}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{connection.node.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {connection.direction === 'outgoing' ? '→' : '←'} {connection.relationship}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {connection.node.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research Insights */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Research Insights
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  This concept is connected to {connections.length} other elements in the Nihiltheism framework.
                </p>
                {node.category === 'core' && (
                  <p>
                    As a core concept, this represents a fundamental pillar of Nihiltheistic thought and serves as a central node for understanding related philosophical themes.
                  </p>
                )}
                {node.category === 'thinker' && (
                  <p>
                    This philosopher's work provides crucial context and intellectual foundation for understanding Nihiltheistic concepts.
                  </p>
                )}
                {connections.some(c => c.node.category === 'thinker') && (
                  <p>
                    Consider exploring the philosophical works of connected thinkers to deepen your understanding of this concept.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NodeDetailPanel;

