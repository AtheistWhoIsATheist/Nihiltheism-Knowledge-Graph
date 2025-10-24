import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ZoomIn, ZoomOut, RotateCcw, Info, Play, Pause, X, Minimize2 } from 'lucide-react';
import graphStore from '../store/graphStore';
import renderReconciler from '../store/renderReconciler';

const NihiltheismGraph = ({
  onNodeClick,
  selectedNode,
  categoryFilters = [],
  showLabels = true,
  onRandomNode,
  onCenterGraph,
  onGraphDataUpdate // New prop to notify parent of graph data changes
}) => {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState(graphStore.toVisualizationFormat());
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [reconcileError, setReconcileError] = useState(null);

  useEffect(() => {
    const unsubscribe = graphStore.subscribe(async newState => {
      try {
        // Perform render reconciliation
        const reconcileResult = await renderReconciler.reconcileWithRenderer(newState, fgRef);
        
        if (reconcileResult.success) {
          setGraphData(graphStore.toVisualizationFormat());
          setReconcileError(null);
          
          if (onGraphDataUpdate) {
            onGraphDataUpdate(newState.nodes, newState.edges);
          }
        } else {
          setReconcileError('Render reconciliation failed');
        }
      } catch (error) {
        console.error('Reconciliation error:', error);
        setReconcileError(error.message);
      }
    });
    
    return () => unsubscribe();
  }, [onGraphDataUpdate]);

  // Filter data based on category filters
  const filteredData = {
    nodes: categoryFilters.length > 0
      ? graphData.nodes.filter(node => categoryFilters.includes(node.category))
      : graphData.nodes,
    links: categoryFilters.length > 0
      ? graphData.links.filter(link => {
          const sourceNode = graphData.nodes.find(n => n.id === (link.source.id || link.source));
          const targetNode = graphData.nodes.find(n => n.id === (link.target.id || link.target));
          return categoryFilters.includes(sourceNode?.category) && categoryFilters.includes(targetNode?.category);
        })
      : graphData.links
  };

  // Search functionality
  useEffect(() => {
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchingNodes = filteredData.nodes.filter(node =>
        node.label.toLowerCase().includes(lowerSearchTerm) ||
        (node.abstract && node.abstract.toLowerCase().includes(lowerSearchTerm)) ||
        (node.aliases && node.aliases.some(alias => alias.toLowerCase().includes(lowerSearchTerm)))
      );

      const nodeIds = new Set(matchingNodes.map(node => node.id));
      const linkIds = new Set();

      filteredData.links.forEach(link => {
        if (nodeIds.has(link.source.id || link.source) || nodeIds.has(link.target.id || link.target)) {
          linkIds.add(link);
        }
      });

      setHighlightNodes(nodeIds);
      setHighlightLinks(linkIds);
    } else {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  }, [searchTerm, filteredData]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragThreshold] = useState(200); // 200ms threshold for drag vs click
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [dragDistanceThreshold] = useState(5); // 5px movement threshold

  const handleNodeClick = useCallback((node, event) => {
    // Only trigger click if we're not dragging
    if (!isDragging) {
      onNodeClick(node);
    }
  }, [isDragging, onNodeClick]);

  const handleNodeDragStart = useCallback((node, event) => {
    setDragStartTime(Date.now());
    setDragStartPosition({ x: event.x || 0, y: event.y || 0 });
    setIsDragging(false);
  }, []);

  const handleNodeDrag = useCallback((node, event) => {
    const currentTime = Date.now();
    const timeSinceDragStart = currentTime - dragStartTime;
    
    // Calculate distance moved
    const deltaX = (event.x || 0) - dragStartPosition.x;
    const deltaY = (event.y || 0) - dragStartPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Mark as dragging if time or distance threshold exceeded
    if (timeSinceDragStart > dragThreshold || distance > dragDistanceThreshold) {
      setIsDragging(true);
    }
  }, [dragStartTime, dragStartPosition, dragThreshold, dragDistanceThreshold]);

  const handleNodeDragEnd = useCallback((node) => {
    // Reset dragging state after a short delay to prevent accidental clicks
    setTimeout(() => {
      setIsDragging(false);
      setDragStartTime(0);
      setDragStartPosition({ x: 0, y: 0 });
    }, 100);
  }, []);

  const handleNodeHover = useCallback((node) => {
    setHoverNode(node);
    if (node) {
      const connectedNodes = new Set([node.id]);
      const connectedLinks = new Set();

      graphData.links.forEach(link => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;

        if (sourceId === node.id || targetId === node.id) {
          connectedLinks.add(link);
          connectedNodes.add(sourceId);
          connectedNodes.add(targetId);
        }
      });

      setHighlightNodes(connectedNodes);
      setHighlightLinks(connectedLinks);
    } else {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  }, [graphData]);

  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHighlighted = highlightNodes.has(node.id);
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isHovered = hoverNode && hoverNode.id === node.id;

    // Determine if label should be shown based on importance, zoom, and selection
    const showNodeLabel = showLabels && (
      node.importance >= 4 || // Always show for importance 4 and 5
      globalScale * node.size > 8 || // Show if zoomed in enough
      isHighlighted ||
      isSelected ||
      isHovered
    );

    let nodeColor = node.color;
    let strokeColor = '#1f2937';
    let strokeWidth = 1;

    if (isHighlighted) {
      strokeColor = '#fbbf24'; // Amber for highlight
      strokeWidth = 3;
    }
    if (isSelected) {
      strokeColor = '#ef4444'; // Red for selected
      strokeWidth = 4;
    }

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI, false);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

    if (showNodeLabel) {
      const label = node.label;
      const fontSize = Math.max(8, node.size / 2);
      ctx.font = `${fontSize}px Inter, sans-serif`;

      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

      // Smart label positioning to avoid collisions
      let labelX = node.x;
      let labelY = node.y;
      
      // Check for nearby nodes and adjust label position
      const nearbyNodes = filteredData.nodes.filter(otherNode => {
        if (otherNode.id === node.id) return false;
        const distance = Math.sqrt(
          Math.pow(otherNode.x - node.x, 2) + Math.pow(otherNode.y - node.y, 2)
        );
        return distance < 80; // Within 80px
      });

      if (nearbyNodes.length > 0) {
        // Find best position to avoid collisions
        const positions = [
          { x: node.x, y: node.y - node.size - fontSize }, // Top
          { x: node.x, y: node.y + node.size + fontSize }, // Bottom
          { x: node.x - textWidth/2 - node.size, y: node.y }, // Left
          { x: node.x + textWidth/2 + node.size, y: node.y }, // Right
        ];

        let bestPosition = positions[0];
        let minCollisions = Infinity;

        positions.forEach(pos => {
          let collisions = 0;
          nearbyNodes.forEach(nearbyNode => {
            const distance = Math.sqrt(
              Math.pow(nearbyNode.x - pos.x, 2) + Math.pow(nearbyNode.y - pos.y, 2)
            );
            if (distance < 40) collisions++;
          });
          
          if (collisions < minCollisions) {
            minCollisions = collisions;
            bestPosition = pos;
          }
        });

        labelX = bestPosition.x;
        labelY = bestPosition.y;
      }

      // Draw background for label to improve readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(labelX - bckgDimensions[0] / 2, labelY - bckgDimensions[1] / 2, ...bckgDimensions);

      // Draw label text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX, labelY);
    }
  }, [highlightNodes, selectedNode, hoverNode, showLabels, filteredData.nodes]);

  const paintLink = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;

    if (typeof start !== 'object' || typeof end !== 'object') return;

    let linkColor = '#4b5563';
    let linkWidth = 1;
    let lineDash = [];

    if (highlightLinks.has(link)) {
      linkColor = '#fbbf24';
      linkWidth = 3;
    }

    // Apply edge styling based on relation type
    switch (link.relationship) {
      case 'refutes':
        lineDash = [5, 5]; // Dashed
        break;
      case 'contrasts':
        lineDash = [1, 2]; // Dotted
        break;
      default:
        lineDash = []; // Solid
        break;
    }

    ctx.strokeStyle = linkColor;
    ctx.lineWidth = linkWidth;
    ctx.setLineDash(lineDash);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash for other drawings

    // Draw arrowhead if directed
    if (link.directed) {
      const arrowLength = 6;
      const arrowWidth = 4;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.save();
      ctx.beginPath();
      ctx.translate(end.x, end.y);
      ctx.rotate(angle);
      ctx.moveTo(-arrowLength, arrowWidth / 2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-arrowLength, -arrowWidth / 2);
      ctx.fillStyle = linkColor;
      ctx.fill();
      ctx.restore();
    }

    // Draw relationship label on hover (only if zoomed in enough)
    if (hoverNode && (start.id === hoverNode.id || end.id === hoverNode.id) && globalScale > 1) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const textWidth = ctx.measureText(link.relationship).width;
      ctx.fillRect(midX - textWidth / 2 - 2, midY - 6, textWidth + 4, 12);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(link.relationship, midX, midY);
    }
  }, [highlightLinks, hoverNode]);

  const zoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.5, 400);
  const zoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.5, 400);
  const resetView = () => fgRef.current?.zoomToFit(400);
  const toggleAnimation = () => {
    if (isAnimating) {
      fgRef.current?.pauseAnimation();
    } else {
      fgRef.current?.resumeAnimation();
    }
    setIsAnimating(!isAnimating);
  };

  const handleRandomNode = () => {
    const randomNode = filteredData.nodes[Math.floor(Math.random() * filteredData.nodes.length)];
    onNodeClick(randomNode);
    if (onRandomNode) onRandomNode(randomNode);
  };

  const handleCenterGraph = () => {
    resetView();
    if (onCenterGraph) onCenterGraph();
  };

  const handleZoom = useCallback(zoom => {
    setCurrentZoom(zoom);
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Reconciliation Error Banner */}
      {reconcileError && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-red-500/90 text-white p-2 text-center text-sm">
          Render mismatch; retried: {reconcileError}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReconcileError(null)}
            className="ml-2 h-5 w-5 p-0 text-white hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Search concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetView}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={toggleAnimation}>
              {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Info className="w-4 h-4" />
              Legend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs">Core Concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-300"></div>
              <span className="text-xs">Sub-Concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs">Thinkers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs">Key Phrases</span>
            </div>
            {categoryFilters.length > 0 && (
              <div className="pt-1 border-t">
                <Badge variant="secondary" className="text-xs">
                  Filtered: {filteredData.nodes.length} nodes
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graph */}
      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={handleNodeHover}
        onZoom={handleZoom}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size + 2, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        linkDirectionalParticles={isAnimating ? 2 : 0}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        backgroundColor="#0f172a"
        width={window.innerWidth}
        height={window.innerHeight}
        enableNodeDrag={true}
      />
    </div>
  );
};

export default NihiltheismGraph;

