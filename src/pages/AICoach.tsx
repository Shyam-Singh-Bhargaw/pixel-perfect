import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { streamChat, ChatMessage } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';

export default function AICoachPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conceptInput, setConceptInput] = useState('');
  const [showConceptInput, setShowConceptInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  // Load today's chat history
  useEffect(() => {
    if (!user) return;
    supabase.from('ai_chat_history').select('*').eq('user_id', user.id).eq('session_date', today).order('created_at')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map(d => ({ role: d.role as 'user' | 'assistant', content: d.content })));
        }
      });
  }, [user, today]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const saveMessage = async (role: 'user' | 'assistant', content: string, contextType?: string) => {
    if (!user) return;
    await supabase.from('ai_chat_history').insert({ user_id: user.id, role, content, session_date: today, context_type: contextType });
  };

  const sendMessage = useCallback(async (text: string, contextType?: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    await saveMessage('user', text, contextType);

    let assistantContent = '';
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    await streamChat({
      messages: newMessages,
      onDelta: upsertAssistant,
      onDone: async () => {
        setIsLoading(false);
        await saveMessage('assistant', assistantContent, contextType);
      },
      onError: (e) => { toast.error(e.message); setIsLoading(false); },
    });
  }, [messages, isLoading, user, today]);

  const quickActions = [
    { emoji: '🎯', label: 'Mock Interview', action: () => sendMessage('Give me a mock ML interview question right now. Ask me, wait for my answer, then evaluate.', 'interview_prep') },
    { emoji: '📚', label: 'Explain Concept', action: () => setShowConceptInput(true) },
    { emoji: '💪', label: 'Motivate Me', action: () => sendMessage('I need a quick motivational push. What should I focus on right now?', 'daily_coach') },
    { emoji: '🔁', label: 'Revision Tip', action: async () => {
      if (!user) return;
      const todayStr = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('revision_items').select('text,topic').eq('user_id', user.id).lte('next_rev', todayStr);
      const items = data?.map(d => `${d.text} (${d.topic})`).join(', ') || 'none';
      sendMessage(`My revision items due today: ${items}. Give me tips for each one.`, 'revision');
    }},
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-4">AI Coach</h1>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-4xl mb-2">🤖</p>
            <p className="text-lg font-heading">PrepOS AI Coach</p>
            <p className="text-sm">Your expert AI/ML interview coach. Ask me anything!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] border-border ${msg.role === 'user' ? 'bg-primary/10' : 'bg-card'}`}>
              <CardContent className="p-3 text-sm prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <Card className="bg-card border-border"><CardContent className="p-3"><span className="animate-pulse-glow text-muted-foreground">Thinking...</span></CardContent></Card>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {quickActions.map(qa => (
          <Button key={qa.label} variant="outline" size="sm" onClick={qa.action} disabled={isLoading} className="text-xs">
            {qa.emoji} {qa.label}
          </Button>
        ))}
      </div>

      {showConceptInput && (
        <div className="flex gap-2 mb-3">
          <Input placeholder="Type concept name..." value={conceptInput} onChange={e => setConceptInput(e.target.value)}
            className="bg-secondary border-border" onKeyDown={e => { if (e.key === 'Enter' && conceptInput) { sendMessage(`Explain this concept in detail: ${conceptInput}`, 'concept_explain'); setConceptInput(''); setShowConceptInput(false); }}} />
          <Button size="sm" onClick={() => { if (conceptInput) { sendMessage(`Explain this concept in detail: ${conceptInput}`, 'concept_explain'); setConceptInput(''); setShowConceptInput(false); } }}>Go</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowConceptInput(false)}>✕</Button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input placeholder="Ask your AI coach..." value={input} onChange={e => setInput(e.target.value)} className="bg-secondary border-border"
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)} disabled={isLoading} />
        <Button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}>Send</Button>
      </div>
    </div>
  );
}
