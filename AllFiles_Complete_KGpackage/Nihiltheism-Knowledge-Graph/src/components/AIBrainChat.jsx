import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  X,
  Minimize2,
  Maximize2,
  Send,
  Loader2,
  MessageCircle,
  Lightbulb,
  BookOpen,
  Sparkles,
  Plus,
  Check,
  AlertCircle
} from 'lucide-react';
import graphStore from '@/store/graphStore';

const AIBrainChat = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [contextSummary, setContextSummary] = useState(null);
  const [graphData, setGraphData] = useState(graphStore.toVisualizationFormat());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Subscribe to graph updates
  useEffect(() => {
    const unsubscribe = graphStore.subscribe(() => {
      setGraphData(graphStore.toVisualizationFormat());
    });
    return () => unsubscribe();
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/brain/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();
      setSessionId(data.session_id);

      // Add welcome message
      setMessages([{
        role: 'assistant',
        content: "Hello! I'm the AI Brain for your Nihiltheism Knowledge Graph. I can help you organize concepts, brainstorm ideas, analyze philosophical relationships, and expand your graph. What would you like to explore?",
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setError('Failed to initialize AI Brain: ' + err.message);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('http://localhost:5000/api/brain/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
          graph_data: graphData
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      const aiResponse = data.response;

      // Add AI response
      const newAiMessage = {
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
        intent: aiResponse.intent,
        suggestions: aiResponse.suggestions || [],
        actions: aiResponse.actions || []
      };
      setMessages(prev => [...prev, newAiMessage]);

      // Update suggestions if any
      if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
        setSuggestions(aiResponse.suggestions);
      }

      // Update context summary
      if (data.context_summary) {
        setContextSummary(data.context_summary);
      }

    } catch (err) {
      setError('Failed to get response: ' + err.message);
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const acceptSuggestion = (suggestion) => {
    if (suggestion.type === 'node') {
      const newNode = {
        id: suggestion.label.trim().toLowerCase().replace(/\s+/g, '-'),
        label: suggestion.label,
        abstract: suggestion.description,
        category: suggestion.category || 'sub_concept',
        importance: suggestion.relevance_score ? Math.ceil(suggestion.relevance_score * 5) : 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      graphStore.dispatch({
        type: 'ADD_NODE',
        payload: newNode,
        idempotencyKey: `ai-brain-add-node-${newNode.id}`
      });

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s !== suggestion));

      // Add confirmation message
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Added "${suggestion.label}" to the graph.`,
        timestamp: new Date().toISOString()
      }]);
    } else if (suggestion.type === 'connection') {
      const newConnection = {
        id: `${suggestion.source}-${suggestion.target}-${suggestion.relationship}`,
        source: suggestion.source,
        target: suggestion.target,
        relation: suggestion.relationship,
        directed: true,
        weight: suggestion.relevance_score ? Math.ceil(suggestion.relevance_score * 5) : 1
      };

      graphStore.dispatch({
        type: 'ADD_EDGE',
        payload: newConnection,
        idempotencyKey: `ai-brain-add-edge-${newConnection.id}`
      });

      setSuggestions(prev => prev.filter(s => s !== suggestion));

      setMessages(prev => [...prev, {
        role: 'system',
        content: `Connected "${suggestion.source_label}" to "${suggestion.target_label}".`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const quickAction = (action) => {
    const actionMessages = {
      brainstorm: 'Brainstorm new philosophical concepts related to nihiltheism',
      organize: 'Suggest ways to organize the current graph structure',
      analyze: 'Analyze the philosophical coherence of the current graph',
      expand: 'Suggest expansions for key concepts in the graph'
    };

    setInputMessage(actionMessages[action] || '');
    inputRef.current?.focus();
  };

  if (!isVisible) return null;

  return (
    <Card className="bg-card/95 backdrop-blur-sm shadow-2xl border-purple-500/30">
      <CardHeader className="pb-3 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="relative">
              <Brain className="w-5 h-5 text-purple-400" />
              {isLoading && (
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                </div>
              )}
            </div>
            AI Brain
            {contextSummary && (
              <Badge variant="secondary" className="text-xs">
                {contextSummary.message_count} messages
              </Badge>
            )}
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
            Conversational AI for organizing, brainstorming, and expanding your philosophical graph
          </CardDescription>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0">
          {/* Quick Actions */}
          <div className="p-3 bg-muted/30 border-b border-purple-500/10">
            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickAction('brainstorm')}
                className="text-xs h-6"
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                Brainstorm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickAction('organize')}
                className="text-xs h-6"
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Organize
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickAction('analyze')}
                className="text-xs h-6"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Analyze
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickAction('expand')}
                className="text-xs h-6"
              >
                <Plus className="w-3 h-3 mr-1" />
                Expand
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-96 p-4">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : message.role === 'error'
                        ? 'bg-destructive/20 text-destructive'
                        : message.role === 'system'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && (
                        <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'error' && (
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'system' && (
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                        {message.intent && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {message.intent}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Show suggestions inline */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.suggestions.slice(0, 3).map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="bg-background/50 rounded p-2 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">
                                {suggestion.label || `${suggestion.source_label} → ${suggestion.target_label}`}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => acceptSuggestion(suggestion)}
                                className="h-5 px-2 text-xs"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            {suggestion.description && (
                              <p className="text-muted-foreground text-xs">
                                {suggestion.description.slice(0, 100)}...
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Suggestions Panel */}
          {suggestions.length > 0 && (
            <div className="p-3 bg-muted/30 border-t border-purple-500/10">
              <div className="text-xs font-medium mb-2">Current Suggestions ({suggestions.length})</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="bg-background/50 rounded p-2 flex items-center justify-between"
                  >
                    <span className="text-xs">
                      {suggestion.label || `${suggestion.source_label} → ${suggestion.target_label}`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acceptSuggestion(suggestion)}
                      className="h-5 px-2"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-2 mx-3 mb-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-purple-500/10">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about nihiltheism or your graph..."
                className="text-xs min-h-[60px] resize-none"
                disabled={isLoading || !sessionId}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || !sessionId}
                className="h-full px-3"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AIBrainChat;
