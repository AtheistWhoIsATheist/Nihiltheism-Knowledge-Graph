import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Expand, 
  X, 
  Minimize2, 
  Maximize2,
  Settings,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import expansionController from '../store/expansionController';
import graphStore from '../store/graphStore';

const ExpansionControls = ({ selectedNode, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stats, setStats] = useState(expansionController.getStats());
  const [activeJobs, setActiveJobs] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(expansionController.getStats());
      setActiveJobs(expansionController.getAllJobs());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const handleExpand = async () => {
    if (!selectedNode) return;

    try {
      const errors = expansionController.validateExpansionRequest([selectedNode.id], graphStore);
      if (errors.length > 0) {
        alert(`Expansion failed: ${errors.join(', ')}`);
        return;
      }

      const results = await expansionController.expandFromNode(
        selectedNode.id,
        graphStore,
        (progress) => {
          // Progress callback - component will update via polling
        }
      );

      if (!results.cancelled) {
        // Apply results to graph store
        results.nodes.forEach(node => {
          graphStore.dispatch({
            type: 'ADD_NODE',
            payload: node,
            idempotencyKey: `expand-node-${node.id}`
          });
        });

        results.edges.forEach(edge => {
          graphStore.dispatch({
            type: 'ADD_EDGE',
            payload: edge,
            idempotencyKey: `expand-edge-${edge.id}`
          });
        });
      }
    } catch (error) {
      console.error('Expansion failed:', error);
      alert(`Expansion failed: ${error.message}`);
    }
  };

  const handleCancelJob = (jobId) => {
    expansionController.cancelJob(jobId);
  };

  const handleSettingsChange = (setting, value) => {
    switch (setting) {
      case 'maxDepth':
        expansionController.setMaxDepth(parseInt(value));
        break;
      case 'maxNodes':
        expansionController.setMaxNodesPerExpand(parseInt(value));
        break;
      case 'maxEdges':
        expansionController.setMaxEdgesPerExpand(parseInt(value));
        break;
    }
    setStats(expansionController.getStats());
  };

  const getJobStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'cancelled':
        return <Square className="w-3 h-3 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      default:
        return <Loader2 className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 w-80">
      <Card className="bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Expand className="w-4 h-4" />
              Expansion Control
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className="h-6 w-6 p-0"
              >
                <Settings className="w-3 h-3" />
              </Button>
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
              Bounded graph expansion with progress tracking
            </CardDescription>
          )}
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="space-y-4">
            {/* Settings Panel */}
            {showSettings && (
              <div className="space-y-3 p-3 bg-muted/30 rounded">
                <div className="text-xs font-medium">Expansion Limits</div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Max Depth</label>
                    <Select 
                      value={String(stats.maxDepth)} 
                      onValueChange={(value) => handleSettingsChange('maxDepth', value)}
                    >
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs">Max Nodes</label>
                    <Select 
                      value={String(stats.maxNodesPerExpand)} 
                      onValueChange={(value) => handleSettingsChange('maxNodes', value)}
                    >
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs">Max Edges</label>
                  <Select 
                    value={String(stats.maxEdgesPerExpand)} 
                    onValueChange={(value) => handleSettingsChange('maxEdges', value)}
                  >
                    <SelectTrigger className="text-xs h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Expansion Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Selected Node</span>
                {selectedNode && (
                  <Badge variant="outline" className="text-xs">
                    {selectedNode.label}
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleExpand}
                disabled={!selectedNode || stats.activeJobsCount >= 5}
                className="w-full text-xs"
                size="sm"
              >
                <Play className="w-3 h-3 mr-1" />
                Expand from Node
              </Button>
              
              {!selectedNode && (
                <p className="text-xs text-muted-foreground text-center">
                  Select a node to expand from
                </p>
              )}
            </div>

            {/* Active Jobs */}
            {activeJobs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium">Active Jobs ({activeJobs.length})</div>
                
                {activeJobs.map(job => (
                  <div key={job.id} className="p-2 bg-muted/30 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getJobStatusIcon(job.status)}
                        <span className="text-xs font-medium">{job.type}</span>
                        <Badge variant="outline" className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      
                      {job.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelJob(job.id)}
                          className="h-5 w-5 p-0"
                        >
                          <Square className="w-2 h-2" />
                        </Button>
                      )}
                    </div>
                    
                    {job.status === 'running' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{job.progress.current}/{job.progress.total}</span>
                        </div>
                        <Progress 
                          value={(job.progress.current / job.progress.total) * 100} 
                          className="h-1"
                        />
                      </div>
                    )}
                    
                    {job.status === 'completed' && (
                      <div className="text-xs text-muted-foreground">
                        Added {job.results.nodes.length} nodes, {job.results.edges.length} edges
                      </div>
                    )}
                    
                    {job.status === 'error' && (
                      <div className="text-xs text-red-500">
                        Error: {job.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Statistics */}
            <div className="pt-2 border-t">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Visited:</span>
                  <span className="ml-1 font-medium">{stats.visitedNodesCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Jobs:</span>
                  <span className="ml-1 font-medium">{stats.activeJobsCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ExpansionControls;

