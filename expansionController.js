class ExpansionController {
  constructor() {
    this.maxDepth = 2;
    this.maxNodesPerExpand = 100;
    this.maxEdgesPerExpand = 200;
    this.visitedNodeIds = new Set();
    this.currentJobs = new Map(); // Track running expansion jobs
    this.jobCounter = 0;
  }

  // Configuration methods
  setMaxDepth(depth) {
    this.maxDepth = Math.max(1, Math.min(3, depth)); // Constrain to 1-3
  }

  setMaxNodesPerExpand(count) {
    this.maxNodesPerExpand = Math.max(10, Math.min(500, count)); // Constrain to 10-500
  }

  setMaxEdgesPerExpand(count) {
    this.maxEdgesPerExpand = Math.max(20, Math.min(1000, count)); // Constrain to 20-1000
  }

  // Job management
  createJob(type, config = {}) {
    const jobId = `job_${++this.jobCounter}`;
    const job = {
      id: jobId,
      type,
      config,
      status: 'pending',
      progress: { current: 0, total: 0 },
      startTime: Date.now(),
      cancelled: false,
      results: { nodes: [], edges: [] }
    };
    
    this.currentJobs.set(jobId, job);
    return job;
  }

  cancelJob(jobId) {
    const job = this.currentJobs.get(jobId);
    if (job) {
      job.cancelled = true;
      job.status = 'cancelled';
      this.currentJobs.delete(jobId);
      return true;
    }
    return false;
  }

  getJob(jobId) {
    return this.currentJobs.get(jobId);
  }

  getAllJobs() {
    return Array.from(this.currentJobs.values());
  }

  // Expansion methods
  async expandFromNode(seedNodeId, graphStore, progressCallback = null) {
    const job = this.createJob('node_expansion', { seedNodeId });
    
    try {
      job.status = 'running';
      
      // Get seed node
      const seedNode = graphStore.getNode(seedNodeId);
      if (!seedNode) {
        throw new Error(`Seed node ${seedNodeId} not found`);
      }

      // Mark seed as visited
      this.visitedNodeIds.add(seedNodeId);
      
      // Perform bounded expansion
      const results = await this.performBoundedExpansion(seedNode, graphStore, job, progressCallback);
      
      if (job.cancelled) {
        job.status = 'cancelled';
        return { cancelled: true };
      }

      job.status = 'completed';
      job.results = results;
      
      // Clean up completed job after a delay
      setTimeout(() => this.currentJobs.delete(job.id), 5000);
      
      return results;
      
    } catch (error) {
      job.status = 'error';
      job.error = error.message;
      throw error;
    }
  }

  async performBoundedExpansion(seedNode, graphStore, job, progressCallback) {
    const results = { nodes: [], edges: [] };
    const queue = [{ node: seedNode, depth: 0 }];
    const processedNodes = new Set([seedNode.id]);
    
    // Estimate total work for progress tracking
    job.progress.total = Math.min(this.maxNodesPerExpand, 50); // Rough estimate
    
    while (queue.length > 0 && !job.cancelled) {
      const { node, depth } = queue.shift();
      
      // Check depth limit
      if (depth >= this.maxDepth) {
        continue;
      }
      
      // Check node limit
      if (results.nodes.length >= this.maxNodesPerExpand) {
        console.warn(`Node cap reached (${this.maxNodesPerExpand}). Stopping expansion.`);
        break;
      }
      
      // Check edge limit
      if (results.edges.length >= this.maxEdgesPerExpand) {
        console.warn(`Edge cap reached (${this.maxEdgesPerExpand}). Stopping expansion.`);
        break;
      }
      
      // Simulate expansion logic (in a real implementation, this would call AI services)
      const expandedData = await this.simulateNodeExpansion(node, depth);
      
      // Process new nodes
      for (const newNode of expandedData.nodes) {
        if (!processedNodes.has(newNode.id) && !this.visitedNodeIds.has(newNode.id)) {
          results.nodes.push(newNode);
          processedNodes.add(newNode.id);
          this.visitedNodeIds.add(newNode.id);
          
          // Add to queue for further expansion if within depth limit
          if (depth + 1 < this.maxDepth) {
            queue.push({ node: newNode, depth: depth + 1 });
          }
        }
      }
      
      // Process new edges
      for (const newEdge of expandedData.edges) {
        if (results.edges.length < this.maxEdgesPerExpand) {
          results.edges.push(newEdge);
        }
      }
      
      // Update progress
      job.progress.current = Math.min(job.progress.current + 1, job.progress.total);
      
      if (progressCallback) {
        progressCallback(job.progress);
      }
      
      // Small delay to allow for cancellation and UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }

  async simulateNodeExpansion(node, depth) {
    // Simulate AI expansion - in real implementation, this would call AI services
    const mockNodes = [];
    const mockEdges = [];
    
    // Generate fewer nodes at deeper levels
    const nodeCount = Math.max(1, 5 - depth * 2);
    
    for (let i = 0; i < nodeCount; i++) {
      const newNodeId = `expanded_${node.id}_${depth}_${i}`;
      const newNode = {
        id: newNodeId,
        label: `Related to ${node.label} (${i + 1})`,
        abstract: `A concept related to ${node.label} discovered through AI expansion at depth ${depth}`,
        category: 'sub_concept',
        importance: Math.max(1, node.importance - depth),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockNodes.push(newNode);
      
      // Create edge back to parent
      const newEdge = {
        id: `${node.id}-${newNodeId}`,
        source: node.id,
        target: newNodeId,
        relation: 'derives',
        weight: Math.max(1, 3 - depth),
        directed: true
      };
      
      mockEdges.push(newEdge);
    }
    
    return { nodes: mockNodes, edges: mockEdges };
  }

  // Batch expansion with backpressure
  async expandMultipleNodes(nodeIds, graphStore, progressCallback = null) {
    const job = this.createJob('batch_expansion', { nodeIds });
    
    try {
      job.status = 'running';
      job.progress.total = nodeIds.length;
      
      const allResults = { nodes: [], edges: [] };
      
      for (let i = 0; i < nodeIds.length && !job.cancelled; i++) {
        const nodeId = nodeIds[i];
        
        // Check limits before each expansion
        if (allResults.nodes.length >= this.maxNodesPerExpand) {
          console.warn(`Global node cap reached. Stopping batch expansion.`);
          break;
        }
        
        const nodeResults = await this.expandFromNode(nodeId, graphStore);
        
        if (!nodeResults.cancelled) {
          allResults.nodes.push(...nodeResults.nodes);
          allResults.edges.push(...nodeResults.edges);
        }
        
        job.progress.current = i + 1;
        
        if (progressCallback) {
          progressCallback(job.progress);
        }
      }
      
      job.status = 'completed';
      job.results = allResults;
      
      return allResults;
      
    } catch (error) {
      job.status = 'error';
      job.error = error.message;
      throw error;
    }
  }

  // Reset visited nodes (for new sessions)
  resetVisitedNodes() {
    this.visitedNodeIds.clear();
  }

  // Get expansion statistics
  getStats() {
    return {
      maxDepth: this.maxDepth,
      maxNodesPerExpand: this.maxNodesPerExpand,
      maxEdgesPerExpand: this.maxEdgesPerExpand,
      visitedNodesCount: this.visitedNodeIds.size,
      activeJobsCount: this.currentJobs.size,
      activeJobs: this.getAllJobs().filter(job => job.status === 'running')
    };
  }

  // Validate expansion request
  validateExpansionRequest(nodeIds, graphStore) {
    const errors = [];
    
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      errors.push('No nodes specified for expansion');
    }
    
    for (const nodeId of nodeIds) {
      if (!graphStore.getNode(nodeId)) {
        errors.push(`Node ${nodeId} not found`);
      }
    }
    
    if (this.currentJobs.size >= 5) { // Max concurrent jobs
      errors.push('Too many expansion jobs running. Please wait or cancel existing jobs.');
    }
    
    return errors;
  }
}

// Create singleton instance
export const expansionController = new ExpansionController();
export default expansionController;

