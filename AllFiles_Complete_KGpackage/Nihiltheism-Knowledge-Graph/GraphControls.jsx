import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Brain, 
  Network, 
  Lightbulb, 
  Quote, 
  Users, 
  Eye, 
  EyeOff,
  Filter,
  Shuffle,
  Target
} from 'lucide-react';

const GraphControls = ({ 
  onCategoryFilter, 
  activeCategoryFilters, 
  onRandomNode, 
  onCenterGraph,
  onToggleLabels,
  showLabels 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    { id: 'core', label: 'Core Concepts', icon: BookOpen, color: 'bg-purple-500' },
    { id: 'sub-concept', label: 'Sub-Concepts', icon: Lightbulb, color: 'bg-purple-300' },
    { id: 'thinker', label: 'Thinkers', icon: Users, color: 'bg-amber-500' },
    { id: 'key-phrase', label: 'Key Phrases', icon: Quote, color: 'bg-emerald-500' }
  ];

  return (
    <div className="absolute bottom-4 right-4 z-10 space-y-2">
      {/* Advanced Controls */}
      {isExpanded && (
        <Card className="w-64 bg-card/90 backdrop-blur-sm animate-in slide-in-from-bottom-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filters */}
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground">Filter by Category</h4>
              <div className="grid grid-cols-2 gap-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategoryFilters.includes(category.id);
                  return (
                    <Button
                      key={category.id}
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => onCategoryFilter(category.id)}
                      className="text-xs h-8 justify-start"
                    >
                      <div className={`w-2 h-2 rounded-full ${category.color} mr-1`} />
                      {category.label.split(' ')[0]}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground">Quick Actions</h4>
              <div className="space-y-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onToggleLabels}
                  className="w-full justify-start text-xs"
                >
                  {showLabels ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {showLabels ? 'Hide Labels' : 'Show Labels'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRandomNode}
                  className="w-full justify-start text-xs"
                >
                  <Shuffle className="w-3 h-3 mr-1" />
                  Random Concept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCenterGraph}
                  className="w-full justify-start text-xs"
                >
                  <Target className="w-3 h-3 mr-1" />
                  Center Graph
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle Button */}
      <Card className="bg-card/90 backdrop-blur-sm">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full"
        >
          <Filter className="w-4 h-4 mr-1" />
          {isExpanded ? 'Hide' : 'Controls'}
        </Button>
      </Card>
    </div>
  );
};

export default GraphControls;

