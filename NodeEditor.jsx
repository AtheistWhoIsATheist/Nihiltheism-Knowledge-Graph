import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  X, 
  Minimize2, 
  Maximize2,
  Link,
  BookOpen,
  Users,
  Quote,
  Lightbulb,
  Save
} from 'lucide-react';
import graphStore from '../store/graphStore';

const NodeEditor = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('node'); // 'node' or 'connection'
  const [graphState, setGraphState] = useState(graphStore.getState());

  // Node form state
  const [nodeForm, setNodeForm] = useState({
    label: '',
    abstract: '',
    category: 'sub_concept',
    importance: '3'
  });
  
  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    sourceId: '',
    targetId: '',
    relation: 'mentions',
    directed: 'false'
  });

  useEffect(() => {
    const unsubscribe = graphStore.subscribe(newState => {
      setGraphState(newState);
    });
    return () => unsubscribe();
  }, []);

  if (!isVisible) return null;

  const categories = [
    { id: 'core_concept', label: 'Core Concept', icon: BookOpen, color: 'bg-purple-500' },
    { id: 'sub_concept', label: 'Sub-Concept', icon: Lightbulb, color: 'bg-purple-300' },
    { id: 'thinker', label: 'Thinker', icon: Users, color: 'bg-amber-500' },
    { id: 'key_phrase', label: 'Key Phrase', icon: Quote, color: 'bg-emerald-500' }
  ];

  const relations = [
    'supports', 'refutes', 'derives', 'contrasts', 'illustrates', 'mentions', 'influences'
  ];

  const handleAddNode = () => {
    if (!nodeForm.label.trim()) return;
    
    const newNode = {
      id: nodeForm.label.trim().toLowerCase().replace(/\s+/g, '-'), // Generate ID from label
      label: nodeForm.label.trim(),
      abstract: nodeForm.abstract.trim(),
      category: nodeForm.category,
      importance: parseInt(nodeForm.importance),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    graphStore.dispatch({
      type: 'ADD_NODE',
      payload: newNode,
      idempotencyKey: `add-node-${newNode.id}`
    });
    setNodeForm({ label: '', abstract: '', category: 'sub_concept', importance: '3' });
  };

  const handleAddConnection = () => {
    if (!connectionForm.sourceId || !connectionForm.targetId || connectionForm.sourceId === connectionForm.targetId) return;
    
    const newConnection = {
      id: `${connectionForm.sourceId}-${connectionForm.targetId}-${connectionForm.relation}`,
      source: connectionForm.sourceId,
      target: connectionForm.targetId,
      relation: connectionForm.relation,
      directed: connectionForm.directed === 'true',
      weight: 1 // Default weight
    };
    
    graphStore.dispatch({
      type: 'ADD_EDGE',
      payload: newConnection,
      idempotencyKey: `add-edge-${newConnection.id}`
    });
    setConnectionForm({ sourceId: '', targetId: '', relation: 'mentions', directed: 'false' });
  };

  const nodesArray = Object.values(graphState.nodes);

  return (
    <div className="absolute top-4 right-80 z-10 w-80">
      <Card className="bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Graph Editor
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
              Add new concepts and connections to the graph
            </CardDescription>
          )}
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="space-y-4">
            {/* Tab Selection */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                size="sm"
                variant={activeTab === 'node' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('node')}
                className="flex-1 text-xs"
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Add Node
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'connection' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('connection')}
                className="flex-1 text-xs"
              >
                <Link className="w-3 h-3 mr-1" />
                Add Connection
              </Button>
            </div>

            {/* Node Form */}
            {activeTab === 'node' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Concept Label</label>
                  <Input
                    placeholder="e.g., Existential Anxiety"
                    value={nodeForm.label}
                    onChange={(e) => setNodeForm(prev => ({ ...prev, label: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Abstract</label>
                  <Textarea
                    placeholder="Describe this philosophical concept..."
                    value={nodeForm.abstract}
                    onChange={(e) => setNodeForm(prev => ({ ...prev, abstract: e.target.value }))}
                    className="text-xs min-h-[60px]"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Category</label>
                  <Select value={nodeForm.category} onValueChange={(value) => setNodeForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => {
                        const Icon = category.icon;
                        return (
                          <SelectItem key={category.id} value={category.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              <Icon className="w-3 h-3" />
                              {category.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Importance (1-5)</label>
                  <Select value={nodeForm.importance} onValueChange={(value) => setNodeForm(prev => ({ ...prev, importance: value }))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(imp => (
                        <SelectItem key={imp} value={String(imp)} className="text-xs">
                          {imp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleAddNode}
                  disabled={!nodeForm.label.trim()}
                  className="w-full text-xs"
                  size="sm"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Add Node
                </Button>
              </div>
            )}

            {/* Connection Form */}
            {activeTab === 'connection' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">From Concept</label>
                  <Select value={connectionForm.sourceId} onValueChange={(value) => setConnectionForm(prev => ({ ...prev, sourceId: value }))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select source concept" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodesArray.map(node => (
                        <SelectItem key={node.id} value={node.id} className="text-xs">
                          {node.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Relationship</label>
                  <Select value={connectionForm.relation} onValueChange={(value) => setConnectionForm(prev => ({ ...prev, relation: value }))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relations.map(rel => (
                        <SelectItem key={rel} value={rel} className="text-xs">
                          {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Directed?</label>
                  <Select value={connectionForm.directed} onValueChange={(value) => setConnectionForm(prev => ({ ...prev, directed: value }))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true" className="text-xs">Yes</SelectItem>
                      <SelectItem value="false" className="text-xs">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">To Concept</label>
                  <Select value={connectionForm.targetId} onValueChange={(value) => setConnectionForm(prev => ({ ...prev, targetId: value }))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select target concept" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodesArray.map(node => (
                        <SelectItem key={node.id} value={node.id} className="text-xs">
                          {node.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleAddConnection}
                  disabled={!connectionForm.sourceId || !connectionForm.targetId || connectionForm.sourceId === connectionForm.targetId}
                  className="w-full text-xs"
                  size="sm"
                >
                  <Link className="w-3 h-3 mr-1" />
                  Add Connection
                </Button>
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{nodesArray.length} nodes</span>
                <span>{Object.values(graphState.edges).length} connections</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default NodeEditor;

