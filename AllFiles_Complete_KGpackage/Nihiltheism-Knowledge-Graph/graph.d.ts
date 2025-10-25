export type Node = {
  id: string;
  label: string;
  category: 'core_concept' | 'sub_concept' | 'thinker' | 'key_phrase';
  importance: 1 | 2 | 3 | 4 | 5;
  abstract?: string;
  aliases?: string[];
  tags?: string[];
  status?: 'draft' | 'refine' | 'ready';
  created_at?: string;
  updated_at?: string;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  relation: 'supports' | 'refutes' | 'derives' | 'contrasts' | 'illustrates' | 'mentions' | 'influences';
  weight?: 1 | 2 | 3 | 4 | 5;
  directed?: boolean;
  evidence?: string;
  notes?: string;
};

export type GraphState = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  seenNodeIds: Set<string>;
  seenEdgeIds: Set<string>;
  version: number;
};

