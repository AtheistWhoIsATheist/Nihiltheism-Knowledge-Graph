import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Network, 
  BookOpen, 
  Users, 
  Quote, 
  Lightbulb,
  ArrowRight,
  Sparkles,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';

const GraphStats = ({ graphData, selectedNode, onNodeSelect }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  const stats = {
    totalNodes: graphData.nodes.length,
    totalConnections: graphData.links.length,
    coreNodes: graphData.nodes.filter(n => n.category === 'core').length,
    subConcepts: graphData.nodes.filter(n => n.category === 'sub-concept').length,
    thinkers: graphData.nodes.filter(n => n.category === 'thinker').length,
    keyPhrases: graphData.nodes.filter(n => n.category === 'key-phrase').length
  };

  // Find most connected nodes
  const nodeConnections = {};
  graphData.links.forEach(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    nodeConnections[sourceId] = (nodeConnections[sourceId] || 0) + 1;
    nodeConnections[targetId] = (nodeConnections[targetId] || 0) + 1;
  });

  const mostConnected = Object.entries(nodeConnections)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([nodeId, connections]) => ({
      node: graphData.nodes.find(n => n.id === nodeId),
      connections
    }));

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'core': return <BookOpen className="w-3 h-3" />;
      case 'sub-concept': return <Lightbulb className="w-3 h-3" />;
      case 'thinker': return <Users className="w-3 h-3" />;
      case 'key-phrase': return <Quote className="w-3 h-3" />;
      default: return <BookOpen className="w-3 h-3" />;
    }
  };

  return (
    <div className="absolute top-20 left-4 z-10 w-72">
      <Card className="bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Graph Analytics
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {!isMinimized && (
            <CardDescription className="text-xs">
              Explore the philosophical network structure
            </CardDescription>
          )}
        </CardHeader>
        {!isMinimized && (
          <CardContent className="space-y-4">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-purple-400">{stats.totalNodes}</div>
                <div className="text-xs text-muted-foreground">Concepts</div>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-amber-400">{stats.totalConnections}</div>
                <div className="text-xs text-muted-foreground">Connections</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground">Category Distribution</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Core Concepts
                  </div>
                  <span>{stats.coreNodes}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-300" />
                    Sub-Concepts
                  </div>
                  <span>{stats.subConcepts}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Thinkers
                  </div>
                  <span>{stats.thinkers}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Key Phrases
                  </div>
                  <span>{stats.keyPhrases}</span>
                </div>
              </div>
            </div>

            {/* Most Connected Nodes */}
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <Network className="w-3 h-3" />
                Most Connected
              </h4>
              <div className="space-y-1">
                {mostConnected.map(({ node, connections }, index) => (
                  <Button
                    key={node.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onNodeSelect(node)}
                    className="w-full justify-between text-xs h-8 px-2"
                  >
                    <div className="flex items-center gap-1 truncate">
                      {getCategoryIcon(node.category)}
                      <span className="truncate">{node.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {connections}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Research Suggestions */}
            <div className="bg-primary/5 p-3 rounded-lg">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Research Suggestions
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-2 h-2" />
                  Start with "Nihiltheism" for overview
                </div>
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-2 h-2" />
                  Explore thinker connections
                </div>
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-2 h-2" />
                  Compare core concepts
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default GraphStats;

