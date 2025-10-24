import React, { useState, useEffect } from 'react';
import { Brain, Network, BookOpen, Edit, Sparkles, Plus, Expand } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NihiltheismGraph from './components/NihiltheismGraph';
import NodeDetailPanel from './components/NodeDetailPanel';
import GraphStats from './components/GraphStats';
import GraphControls from './components/GraphControls';
import AISuggestions from './components/AISuggestions';
import NodeEditor from './components/NodeEditor';
import WelcomePanel from './components/WelcomePanel';
import ExpansionControls from './components/ExpansionControls';
import graphStore from './store/graphStore';

function App() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [showLabels, setShowLabels] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showExpansion, setShowExpansion] = useState(false);
  const [graphData, setGraphData] = useState(graphStore.toVisualizationFormat());

  useEffect(() => {
    const unsubscribe = graphStore.subscribe(() => {
      setGraphData(graphStore.toVisualizationFormat());
    });
    return () => unsubscribe();
  }, []);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setShowWelcome(false);
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
  };

  const handleCategoryFilter = (category) => {
    setCategoryFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleToggleLabels = () => {
    setShowLabels(!showLabels);
  };

  const handleRandomNode = () => {
    const nodes = Object.values(graphStore.getState().nodes);
    if (nodes.length > 0) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      handleNodeClick(randomNode);
    }
  };

  const handleCenterGraph = () => {
    // This will be handled by the graph component
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 text-white relative">
      {/* Background Graph */}
      <div className="absolute inset-0">
        <NihiltheismGraph
          data={graphData}
          onNodeClick={handleNodeClick}
          selectedNode={selectedNode}
          categoryFilters={categoryFilters}
          showLabels={showLabels}
          onRandomNode={handleRandomNode}
          onCenterGraph={handleCenterGraph}
        />
      </div>

      {/* Header Bar - Fixed at top */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h1 className="text-lg font-bold">Nihiltheism Interactive Graph</h1>
            <Badge variant="secondary" className="text-xs">
              {graphData.nodes.length} concepts • {graphData.links.length} connections
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showStats ? "default" : "outline"}
              onClick={() => setShowStats(!showStats)}
              className="text-xs"
            >
              <Network className="w-3 h-3 mr-1" />
              Stats
            </Button>
            <Button
              size="sm"
              variant={showEditor ? "default" : "outline"}
              onClick={() => setShowEditor(!showEditor)}
              className="text-xs"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant={showAI ? "default" : "outline"}
              onClick={() => setShowAI(!showAI)}
              className="text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              AI
            </Button>
          </div>
        </div>
      </div>

      {/* Left Sidebar - Non-overlapping */}
      <div className="absolute left-4 top-20 bottom-4 w-80 flex flex-col gap-4 z-20 pointer-events-none">
        {/* Graph Controls - Always visible */}
        <div className="pointer-events-auto">
          <GraphControls
            onCategoryFilter={handleCategoryFilter}
            activeCategoryFilters={categoryFilters}
            onRandomNode={handleRandomNode}
            onCenterGraph={handleCenterGraph}
            onToggleLabels={handleToggleLabels}
            showLabels={showLabels}
          />
        </div>

        {/* Node Editor - Conditional */}
        {showEditor && (
          <div className="pointer-events-auto">
            <NodeEditor
              onClose={() => setShowEditor(false)}
            />
          </div>
        )}

        {/* Expansion Controls - Conditional */}
        {showExpansion && (
          <div className="pointer-events-auto">
            <ExpansionControls
              selectedNode={selectedNode}
              onClose={() => setShowExpansion(false)}
            />
          </div>
        )}
      </div>

      {/* Right Sidebar - Non-overlapping */}
      <div className="absolute right-4 top-20 bottom-4 w-80 flex flex-col gap-4 z-20 pointer-events-none">
        {/* Node Detail Panel - Conditional */}
        {selectedNode && (
          <div className="pointer-events-auto">
            <NodeDetailPanel
              node={selectedNode}
              onClose={handleClosePanel}
              graphData={graphData}
            />
          </div>
        )}

        {/* Graph Stats - Conditional */}
        {showStats && (
          <div className="pointer-events-auto">
            <GraphStats
              graphData={graphData}
              selectedNode={selectedNode}
              onNodeSelect={handleNodeClick}
              onClose={() => setShowStats(false)}
            />
          </div>
        )}

        {/* AI Suggestions - Conditional */}
        {showAI && (
          <div className="pointer-events-auto">
            <AISuggestions
              onClose={() => setShowAI(false)}
            />
          </div>
        )}
      </div>

      {/* Center Overlay - Welcome Panel */}
      {showWelcome && !selectedNode && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40 pointer-events-auto">
          <div className="max-w-2xl mx-4">
            <WelcomePanel
              onClose={() => setShowWelcome(false)}
            />
          </div>
        </div>
      )}

      {/* Floating Action Button - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-30 pointer-events-auto">
        <Button
          onClick={() => setShowExpansion(!showExpansion)}
          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
          title="Expand Graph"
        >
          <Expand className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

export default App;

