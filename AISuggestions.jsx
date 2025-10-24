import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Plus,
  Link,
  Loader2,
  BookOpen,
  Users,
  Quote,
  Lightbulb,
  RefreshCw,
  FileText
} from 'lucide-react';
import graphStore from '../store/graphStore'; // Import the graph store

const AISuggestions = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('auto'); // 'auto' or 'text'
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(graphStore.toVisualizationFormat());

  useEffect(() => {
    const unsubscribe = graphStore.subscribe(newState => {
      setGraphData(graphStore.toVisualizationFormat());
    });
    return () => unsubscribe();
  }, []);

  if (!isVisible) return null;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'core_concept': return <BookOpen className="w-3 h-3" />;
      case 'sub_concept': return <Lightbulb className="w-3 h-3" />;
      case 'thinker': return <Users className="w-3 h-3" />;
      case 'key_phrase': return <Quote className="w-3 h-3" />;
      default: return <BookOpen className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'core_concept': return 'bg-purple-500';
      case 'sub_concept': return 'bg-purple-300';
      case 'thinker': return 'bg-amber-500';
      case 'key_phrase': return 'bg-emerald-500';
      default: return 'bg-purple-500';
    }
  };

  const fetchAutoSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("http://localhost:5000/api/suggest", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graphData: graphStore.toVisualizationFormat() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCustomText = async () => {
    if (!customText.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("http://localhost:5000/api/analyze-text", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: customText,
          graphData: graphStore.toVisualizationFormat()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze text');
      }
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err.message);
      console.error('Error analyzing text:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion) => {
    if (suggestion.type === 'node') {
      const newNode = {
        id: suggestion.label.trim().toLowerCase().replace(/\s+/g, '-'),
        label: suggestion.label,
        abstract: suggestion.description,
        category: suggestion.category,
        importance: suggestion.relevance_score ? Math.ceil(suggestion.relevance_score * 5) : 3, // Scale 0-1 to 1-5
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      graphStore.dispatch({
        type: 'ADD_NODE',
        payload: newNode,
        idempotencyKey: `ai-add-node-${newNode.id}`
      });
    } else if (suggestion.type === 'connection') {
      const newConnection = {
        id: `${suggestion.source}-${suggestion.target}-${suggestion.relationship}`,
        source: suggestion.source,
        target: suggestion.target,
        relation: suggestion.relationship,
        directed: graphStore.isDirectedRelation(suggestion.relationship),
        weight: suggestion.relevance_score ? Math.ceil(suggestion.relevance_score * 5) : 1
      };
      graphStore.dispatch({
        type: 'ADD_EDGE',
        payload: newConnection,
        idempotencyKey: `ai-add-edge-${newConnection.id}`
      });
    }
    
    // Remove the accepted suggestion from the list
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleRejectSuggestion = (suggestion) => {
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  // Auto-fetch suggestions when component mounts or graph data changes
  useEffect(() => {
    if (activeTab === 'auto' && graphData.nodes.length > 0) {
      fetchAutoSuggestions();
    }
  }, [graphData, activeTab]);

  return (
    <div className="absolute top-4 left-80 z-10 w-96">
      <Card className="bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              AI Suggestions
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
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {!isMinimized && (
            <CardDescription className="text-xs">
              AI-powered suggestions for expanding your philosophical graph
            </CardDescription>
          )}
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="space-y-4">
            {/* Tab Selection */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                size="sm"
                variant={activeTab === 'auto' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('auto')}
                className="flex-1 text-xs"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Auto Analysis
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'text' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('text')}
                className="flex-1 text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                Text Analysis
              </Button>
            </div>

            {/* Auto Analysis Tab */}
            {activeTab === 'auto' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Graph Analysis</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchAutoSuggestions}
                    disabled={loading}
                    className="text-xs h-6"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI analyzes your current graph structure and suggests relevant philosophical concepts and connections.
                </p>
              </div>
            )}

            {/* Text Analysis Tab */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Philosophical Text</label>
                  <Textarea
                    placeholder="Paste philosophical text to extract concepts..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="text-xs min-h-[80px]"
                  />
                </div>
                <Button
                  onClick={analyzeCustomText}
                  disabled={loading || !customText.trim()}
                  className="w-full text-xs"
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Brain className="w-3 h-3 mr-1" />
                  )}
                  Analyze Text
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Suggestions List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Suggestions ({suggestions.length})</span>
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                )}
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {loading && suggestions.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-xs text-muted-foreground">Analyzing...</span>
                    </div>
                  )}
                  
                  {suggestions.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {activeTab === 'auto'
                          ? 'Click refresh to get AI suggestions based on your graph'
                          : 'Enter philosophical text above to extract concepts'
                        }
                      </p>
                    </div>
                  )}
                  
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="p-3 bg-muted/30">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {suggestion.type === 'node' ? (
                              <>
                                {getCategoryIcon(suggestion.category)}
                                <span className="text-xs font-medium">{suggestion.label}</span>
                                <div className={`w-2 h-2 rounded-full ${getCategoryColor(suggestion.category)}`} />
                              </>
                            ) : (
                              <>
                                <Link className="w-3 h-3" />
                                <span className="text-xs font-medium">
                                  {suggestion.source_label} → {suggestion.target_label}
                                </span>
                              </>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.relevance_score * 100)}%
                          </Badge>
                        </div>
                        
                        {suggestion.type === 'node' && (
                          <p className="text-xs text-muted-foreground">
                            {suggestion.description}
                          </p>
                        )}
                        
                        {suggestion.type === 'connection' && (
                          <p className="text-xs text-muted-foreground">
                            Relationship: <span className="font-medium">{suggestion.relationship}</span>
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground italic">
                          {suggestion.reasoning}
                        </p>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            className="text-xs h-6 flex-1"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectSuggestion(suggestion)}
                            className="text-xs h-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AISuggestions;


