class RenderReconciler {
  constructor() {
    this.lastRenderedState = null;
    this.pendingUpdates = new Set();
    this.reconciliationInProgress = false;
    this.errorCount = 0;
    this.maxRetries = 3;
  }

  // Two-phase commit: Apply to store, then reconcile to renderer
  async reconcileWithRenderer(graphState, rendererRef, forceReconcile = false) {
    if (this.reconciliationInProgress && !forceReconcile) {
      console.log('Reconciliation already in progress, skipping');
      return { success: true, skipped: true };
    }

    this.reconciliationInProgress = true;

    try {
      // Phase 1: Compute diff between current state and last rendered state
      const diff = this.computeStateDiff(this.lastRenderedState, graphState);
      
      if (diff.isEmpty && !forceReconcile) {
        this.reconciliationInProgress = false;
        return { success: true, noChanges: true };
      }

      // Phase 2: Apply diff to renderer
      const reconcileResult = await this.applyDiffToRenderer(diff, rendererRef);
      
      if (!reconcileResult.success) {
        throw new Error(`Render reconciliation failed: ${reconcileResult.error}`);
      }

      // Phase 3: Verify rendered state matches store
      const verificationResult = await this.verifyRenderedState(graphState, rendererRef);
      
      if (!verificationResult.success) {
        console.error('Render mismatch detected:', verificationResult.mismatches);
        
        if (this.errorCount < this.maxRetries) {
          this.errorCount++;
          console.log(`Retrying reconciliation (attempt ${this.errorCount}/${this.maxRetries})`);
          
          // Rollback and retry
          await this.rollbackRenderer(rendererRef);
          this.reconciliationInProgress = false;
          return await this.reconcileWithRenderer(graphState, rendererRef, true);
        } else {
          throw new Error('Render reconciliation failed after maximum retries');
        }
      }

      // Success - update last rendered state
      this.lastRenderedState = this.cloneState(graphState);
      this.errorCount = 0;
      this.reconciliationInProgress = false;

      return {
        success: true,
        diff,
        applied: reconcileResult.applied,
        verified: true
      };

    } catch (error) {
      this.reconciliationInProgress = false;
      this.errorCount++;
      
      // Show error banner to user
      this.showErrorBanner('Render mismatch; retried', error.message);
      
      throw error;
    }
  }

  computeStateDiff(oldState, newState) {
    const diff = {
      nodes: { added: [], updated: [], removed: [] },
      edges: { added: [], updated: [], removed: [] },
      isEmpty: true
    };

    if (!oldState) {
      // First render - everything is new
      diff.nodes.added = Object.values(newState.nodes);
      diff.edges.added = Object.values(newState.edges);
      diff.isEmpty = false;
      return diff;
    }

    // Compare nodes
    const oldNodeIds = new Set(Object.keys(oldState.nodes));
    const newNodeIds = new Set(Object.keys(newState.nodes));

    // Added nodes
    for (const nodeId of newNodeIds) {
      if (!oldNodeIds.has(nodeId)) {
        diff.nodes.added.push(newState.nodes[nodeId]);
        diff.isEmpty = false;
      }
    }

    // Removed nodes
    for (const nodeId of oldNodeIds) {
      if (!newNodeIds.has(nodeId)) {
        diff.nodes.removed.push(oldState.nodes[nodeId]);
        diff.isEmpty = false;
      }
    }

    // Updated nodes
    for (const nodeId of newNodeIds) {
      if (oldNodeIds.has(nodeId)) {
        const oldNode = oldState.nodes[nodeId];
        const newNode = newState.nodes[nodeId];
        
        if (this.hasNodeChanged(oldNode, newNode)) {
          diff.nodes.updated.push({ old: oldNode, new: newNode });
          diff.isEmpty = false;
        }
      }
    }

    // Compare edges
    const oldEdgeIds = new Set(Object.keys(oldState.edges));
    const newEdgeIds = new Set(Object.keys(newState.edges));

    // Added edges
    for (const edgeId of newEdgeIds) {
      if (!oldEdgeIds.has(edgeId)) {
        diff.edges.added.push(newState.edges[edgeId]);
        diff.isEmpty = false;
      }
    }

    // Removed edges
    for (const edgeId of oldEdgeIds) {
      if (!newEdgeIds.has(edgeId)) {
        diff.edges.removed.push(oldState.edges[edgeId]);
        diff.isEmpty = false;
      }
    }

    // Updated edges
    for (const edgeId of newEdgeIds) {
      if (oldEdgeIds.has(edgeId)) {
        const oldEdge = oldState.edges[edgeId];
        const newEdge = newState.edges[edgeId];
        
        if (this.hasEdgeChanged(oldEdge, newEdge)) {
          diff.edges.updated.push({ old: oldEdge, new: newEdge });
          diff.isEmpty = false;
        }
      }
    }

    return diff;
  }

  hasNodeChanged(oldNode, newNode) {
    return (
      oldNode.label !== newNode.label ||
      oldNode.category !== newNode.category ||
      oldNode.importance !== newNode.importance ||
      oldNode.abstract !== newNode.abstract ||
      oldNode.updated_at !== newNode.updated_at
    );
  }

  hasEdgeChanged(oldEdge, newEdge) {
    return (
      oldEdge.source !== newEdge.source ||
      oldEdge.target !== newEdge.target ||
      oldEdge.relation !== newEdge.relation ||
      oldEdge.weight !== newEdge.weight ||
      oldEdge.directed !== newEdge.directed
    );
  }

  async applyDiffToRenderer(diff, rendererRef) {
    try {
      const applied = { nodes: 0, edges: 0 };

      if (!rendererRef.current) {
        throw new Error('Renderer reference is null');
      }

      // Get current graph data from renderer
      const currentGraphData = rendererRef.current.graphData();
      const newGraphData = { ...currentGraphData };

      // Apply node changes
      if (diff.nodes.added.length > 0) {
        const newNodes = diff.nodes.added.map(node => this.nodeToVisualizationFormat(node));
        newGraphData.nodes = [...(newGraphData.nodes || []), ...newNodes];
        applied.nodes += newNodes.length;
      }

      if (diff.nodes.removed.length > 0) {
        const removedIds = new Set(diff.nodes.removed.map(node => node.id));
        newGraphData.nodes = (newGraphData.nodes || []).filter(node => !removedIds.has(node.id));
        applied.nodes += diff.nodes.removed.length;
      }

      if (diff.nodes.updated.length > 0) {
        const nodeMap = new Map((newGraphData.nodes || []).map(node => [node.id, node]));
        
        for (const { new: updatedNode } of diff.nodes.updated) {
          const visualNode = this.nodeToVisualizationFormat(updatedNode);
          nodeMap.set(updatedNode.id, visualNode);
          applied.nodes++;
        }
        
        newGraphData.nodes = Array.from(nodeMap.values());
      }

      // Apply edge changes
      if (diff.edges.added.length > 0) {
        const newEdges = diff.edges.added.map(edge => this.edgeToVisualizationFormat(edge));
        newGraphData.links = [...(newGraphData.links || []), ...newEdges];
        applied.edges += newEdges.length;
      }

      if (diff.edges.removed.length > 0) {
        const removedIds = new Set(diff.edges.removed.map(edge => edge.id));
        newGraphData.links = (newGraphData.links || []).filter(link => {
          const linkId = `${link.source}-${link.target}`;
          return !removedIds.has(linkId);
        });
        applied.edges += diff.edges.removed.length;
      }

      if (diff.edges.updated.length > 0) {
        const linkMap = new Map();
        (newGraphData.links || []).forEach(link => {
          const linkId = `${link.source}-${link.target}`;
          linkMap.set(linkId, link);
        });
        
        for (const { new: updatedEdge } of diff.edges.updated) {
          const visualEdge = this.edgeToVisualizationFormat(updatedEdge);
          linkMap.set(updatedEdge.id, visualEdge);
          applied.edges++;
        }
        
        newGraphData.links = Array.from(linkMap.values());
      }

      // Apply the new graph data to the renderer
      rendererRef.current.graphData(newGraphData);

      return { success: true, applied };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  nodeToVisualizationFormat(node) {
    return {
      id: node.id,
      label: node.label,
      category: node.category,
      importance: node.importance,
      description: node.abstract,
      size: 8 + (node.importance * 2),
      color: this.getNodeColor(node.category)
    };
  }

  edgeToVisualizationFormat(edge) {
    return {
      source: edge.source,
      target: edge.target,
      relationship: edge.relation,
      strength: edge.weight,
      directed: edge.directed
    };
  }

  getNodeColor(category) {
    const colors = {
      'core_concept': '#8B5CF6',
      'sub_concept': '#C084FC',
      'thinker': '#F59E0B',
      'key_phrase': '#10B981'
    };
    return colors[category] || '#6B7280';
  }

  async verifyRenderedState(graphState, rendererRef) {
    try {
      if (!rendererRef.current) {
        return { success: false, error: 'Renderer reference is null' };
      }

      const renderedData = rendererRef.current.graphData();
      const mismatches = [];

      // Verify node counts
      const expectedNodeCount = Object.keys(graphState.nodes).length;
      const actualNodeCount = (renderedData.nodes || []).length;
      
      if (expectedNodeCount !== actualNodeCount) {
        mismatches.push(`Node count mismatch: expected ${expectedNodeCount}, got ${actualNodeCount}`);
      }

      // Verify edge counts
      const expectedEdgeCount = Object.keys(graphState.edges).length;
      const actualEdgeCount = (renderedData.links || []).length;
      
      if (expectedEdgeCount !== actualEdgeCount) {
        mismatches.push(`Edge count mismatch: expected ${expectedEdgeCount}, got ${actualEdgeCount}`);
      }

      // Sample verification of node attributes
      const sampleNodes = Object.values(graphState.nodes).slice(0, 5);
      const renderedNodeMap = new Map((renderedData.nodes || []).map(node => [node.id, node]));
      
      for (const storeNode of sampleNodes) {
        const renderedNode = renderedNodeMap.get(storeNode.id);
        if (!renderedNode) {
          mismatches.push(`Node ${storeNode.id} missing from renderer`);
        } else if (renderedNode.label !== storeNode.label) {
          mismatches.push(`Node ${storeNode.id} label mismatch: expected "${storeNode.label}", got "${renderedNode.label}"`);
        }
      }

      return {
        success: mismatches.length === 0,
        mismatches
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async rollbackRenderer(rendererRef) {
    try {
      if (this.lastRenderedState && rendererRef.current) {
        const rollbackData = {
          nodes: Object.values(this.lastRenderedState.nodes).map(node => this.nodeToVisualizationFormat(node)),
          links: Object.values(this.lastRenderedState.edges).map(edge => this.edgeToVisualizationFormat(edge))
        };
        
        rendererRef.current.graphData(rollbackData);
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  }

  showErrorBanner(title, message) {
    // In a real implementation, this would show a user-visible error banner
    console.error(`${title}: ${message}`);
    
    // Could dispatch to a global error state or show a toast notification
    if (window.showErrorToast) {
      window.showErrorToast(title, message);
    }
  }

  cloneState(state) {
    return {
      nodes: { ...state.nodes },
      edges: { ...state.edges },
      seenNodeIds: new Set(state.seenNodeIds),
      seenEdgeIds: new Set(state.seenEdgeIds),
      version: state.version
    };
  }

  // Reset reconciler state
  reset() {
    this.lastRenderedState = null;
    this.pendingUpdates.clear();
    this.reconciliationInProgress = false;
    this.errorCount = 0;
  }

  // Get reconciliation statistics
  getStats() {
    return {
      lastRenderedVersion: this.lastRenderedState?.version || 0,
      pendingUpdates: this.pendingUpdates.size,
      reconciliationInProgress: this.reconciliationInProgress,
      errorCount: this.errorCount,
      maxRetries: this.maxRetries
    };
  }
}

// Create singleton instance
export const renderReconciler = new RenderReconciler();
export default renderReconciler;

