import { graphData } from '../data/graphData.js';

class GraphStore {
  constructor() {
    this.state = {
      nodes: {},
      edges: {},
      seenNodeIds: new Set(),
      seenEdgeIds: new Set(),
      version: 0
    };
    
    this.transactionQueue = [];
    this.processedActions = new Set(); // For idempotency
    this.listeners = new Set();
    
    // Initialize with existing data
    this.initializeFromData(graphData);
  }

  initializeFromData(data) {
    // Convert array format to record format and normalize
    data.nodes.forEach(node => {
      const normalizedNode = this.normalizeNode(node);
      this.state.nodes[normalizedNode.id] = normalizedNode;
      this.state.seenNodeIds.add(normalizedNode.id);
    });

    data.links.forEach(link => {
      const normalizedEdge = this.normalizeEdge(link);
      this.state.edges[normalizedEdge.id] = normalizedEdge;
      this.state.seenEdgeIds.add(normalizedEdge.id);
    });

    this.state.version = 1;
    this.notifyListeners();
  }

  normalizeNode(node) {
    return {
      id: node.id,
      label: node.label,
      category: this.normalizeCategoryName(node.category),
      importance: node.importance || this.inferImportance(node),
      abstract: node.description || node.abstract,
      aliases: node.aliases || [],
      tags: node.tags || [],
      status: node.status || 'ready',
      created_at: node.created_at || new Date().toISOString(),
      updated_at: node.updated_at || new Date().toISOString()
    };
  }

  normalizeEdge(link) {
    const id = link.id || `${link.source}-${link.target}`;
    return {
      id,
      source: link.source,
      target: link.target,
      relation: this.normalizeRelation(link.relationship || link.relation),
      weight: link.weight || link.strength || 1,
      directed: this.isDirectedRelation(link.relationship || link.relation),
      evidence: link.evidence || '',
      notes: link.notes || ''
    };
  }

  normalizeCategoryName(category) {
    const categoryMap = {
      'core': 'core_concept',
      'sub-concept': 'sub_concept',
      'thinker': 'thinker',
      'key-phrase': 'key_phrase'
    };
    return categoryMap[category] || category;
  }

  normalizeRelation(relation) {
    const relationMap = {
      'explores': 'illustrates',
      'leads to': 'derives',
      'confronts': 'contrasts',
      'references': 'mentions',
      'discusses': 'illustrates',
      'establishes': 'supports',
      'reveals': 'derives',
      'prompts': 'derives',
      'critiques as': 'refutes',
      'encounters': 'illustrates',
      'case study': 'illustrates',
      'turns toward': 'derives',
      'involves': 'supports',
      'accessed through': 'derives'
    };
    return relationMap[relation] || 'mentions';
  }

  isDirectedRelation(relation) {
    const directedRelations = ['influences', 'derives'];
    return directedRelations.includes(this.normalizeRelation(relation));
  }

  inferImportance(node) {
    // Infer importance based on category and connections
    if (node.category === 'core') return 5;
    if (node.category === 'sub-concept') return 3;
    if (node.category === 'thinker') return 4;
    if (node.category === 'key-phrase') return 2;
    return 3;
  }

  // Transaction system for idempotent mutations
  dispatch(action) {
    const actionKey = `${action.type}-${action.idempotencyKey || JSON.stringify(action.payload)}`;
    
    // Check if action already processed (idempotency)
    if (this.processedActions.has(actionKey)) {
      console.log('Action already processed, skipping:', actionKey);
      return this.state;
    }

    // Add to transaction queue
    this.transactionQueue.push({ ...action, actionKey });
    
    // Process transaction
    this.processTransaction(action, actionKey);
    
    return this.state;
  }

  processTransaction(action, actionKey) {
    const prevVersion = this.state.version;
    
    try {
      switch (action.type) {
        case 'ADD_NODE':
          this.addNode(action.payload);
          break;
        case 'UPDATE_NODE':
          this.updateNode(action.payload);
          break;
        case 'DELETE_NODE':
          this.deleteNode(action.payload);
          break;
        case 'ADD_EDGE':
          this.addEdge(action.payload);
          break;
        case 'UPDATE_EDGE':
          this.updateEdge(action.payload);
          break;
        case 'DELETE_EDGE':
          this.deleteEdge(action.payload);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Mark action as processed
      this.processedActions.add(actionKey);
      
      // Increment version exactly once
      this.state.version = prevVersion + 1;
      
      // Notify listeners
      this.notifyListeners();
      
    } catch (error) {
      console.error('Transaction failed:', error);
      // Rollback would go here if needed
      throw error;
    }
  }

  addNode(nodeData) {
    const node = this.normalizeNode(nodeData);
    
    // Check for duplicates
    if (this.state.seenNodeIds.has(node.id)) {
      console.log('Node already exists:', node.id);
      return;
    }

    this.state.nodes[node.id] = node;
    this.state.seenNodeIds.add(node.id);
  }

  updateNode(nodeData) {
    if (!this.state.nodes[nodeData.id]) {
      throw new Error(`Node ${nodeData.id} not found`);
    }

    const updatedNode = {
      ...this.state.nodes[nodeData.id],
      ...this.normalizeNode(nodeData),
      updated_at: new Date().toISOString()
    };

    this.state.nodes[nodeData.id] = updatedNode;
  }

  deleteNode(nodeId) {
    if (!this.state.nodes[nodeId]) {
      console.log('Node not found for deletion:', nodeId);
      return;
    }

    // Remove node
    delete this.state.nodes[nodeId];
    this.state.seenNodeIds.delete(nodeId);

    // Remove associated edges
    Object.keys(this.state.edges).forEach(edgeId => {
      const edge = this.state.edges[edgeId];
      if (edge.source === nodeId || edge.target === nodeId) {
        delete this.state.edges[edgeId];
        this.state.seenEdgeIds.delete(edgeId);
      }
    });
  }

  addEdge(edgeData) {
    const edge = this.normalizeEdge(edgeData);
    
    // Check for duplicates
    if (this.state.seenEdgeIds.has(edge.id)) {
      console.log('Edge already exists:', edge.id);
      return;
    }

    // Validate source and target exist
    if (!this.state.nodes[edge.source] || !this.state.nodes[edge.target]) {
      throw new Error(`Invalid edge: source or target node not found`);
    }

    this.state.edges[edge.id] = edge;
    this.state.seenEdgeIds.add(edge.id);
  }

  updateEdge(edgeData) {
    if (!this.state.edges[edgeData.id]) {
      throw new Error(`Edge ${edgeData.id} not found`);
    }

    const updatedEdge = {
      ...this.state.edges[edgeData.id],
      ...this.normalizeEdge(edgeData)
    };

    this.state.edges[edgeData.id] = updatedEdge;
  }

  deleteEdge(edgeId) {
    if (!this.state.edges[edgeId]) {
      console.log('Edge not found for deletion:', edgeId);
      return;
    }

    delete this.state.edges[edgeId];
    this.state.seenEdgeIds.delete(edgeId);
  }

  // Getters for accessing state
  getState() {
    return { ...this.state };
  }

  getNodes() {
    return Object.values(this.state.nodes);
  }

  getEdges() {
    return Object.values(this.state.edges);
  }

  getNode(id) {
    return this.state.nodes[id];
  }

  getEdge(id) {
    return this.state.edges[id];
  }

  // Convert to format expected by visualization library
  toVisualizationFormat() {
    return {
      nodes: this.getNodes().map(node => ({
        id: node.id,
        label: node.label,
        category: node.category,
        importance: node.importance,
        description: node.abstract,
        size: this.calculateNodeSize(node),
        color: this.getNodeColor(node.category)
      })),
      links: this.getEdges().map(edge => ({
        source: edge.source,
        target: edge.target,
        relationship: edge.relation,
        strength: edge.weight,
        directed: edge.directed
      }))
    };
  }

  calculateNodeSize(node) {
    return 8 + (node.importance * 2);
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

  // Listener system for reactive updates
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Validation methods
  validateState() {
    const errors = [];

    // Check for invalid relations
    Object.values(this.state.edges).forEach(edge => {
      const validRelations = ['supports', 'refutes', 'derives', 'contrasts', 'illustrates', 'mentions', 'influences'];
      if (!validRelations.includes(edge.relation)) {
        errors.push(`Invalid relation: ${edge.relation} in edge ${edge.id}`);
      }
    });

    // Check for orphaned edges
    Object.values(this.state.edges).forEach(edge => {
      if (!this.state.nodes[edge.source]) {
        errors.push(`Orphaned edge: source node ${edge.source} not found`);
      }
      if (!this.state.nodes[edge.target]) {
        errors.push(`Orphaned edge: target node ${edge.target} not found`);
      }
    });

    return errors;
  }
}

// Create singleton instance
export const graphStore = new GraphStore();
export default graphStore;

