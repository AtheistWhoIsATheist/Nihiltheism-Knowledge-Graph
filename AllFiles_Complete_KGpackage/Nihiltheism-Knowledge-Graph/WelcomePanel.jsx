import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, X, Minimize2, Maximize2 } from 'lucide-react';

const WelcomePanel = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <Card className="w-80 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Welcome to Nihiltheism
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
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {!isMinimized && (
            <CardDescription>
              An interactive exploration of philosophical concepts
            </CardDescription>
          )}
        </CardHeader>
        {!isMinimized && (
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Click on any node to explore its connections and dive deeper into the philosophical framework of Nihiltheism.
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">Search concepts</Badge>
              <Badge variant="outline" className="text-xs">Filter categories</Badge>
              <Badge variant="outline" className="text-xs">Analyze connections</Badge>
              <Badge variant="outline" className="text-xs">Discover insights</Badge>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default WelcomePanel;

