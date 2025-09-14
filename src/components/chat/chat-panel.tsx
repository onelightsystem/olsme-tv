"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { getPolitenessPrompt } from "@/ai/actions";

type Message = {
  sender: "You" | "olsme-user";
  text: string;
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [politenessPrompt, setPolitenessPrompt] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    const newMessages: Message[] = [...messages, { sender: "You", text: newMessage }];
    setMessages(newMessages);
    setNewMessage("");

    // Simulate olsme-user's reply for demo
    setTimeout(() => {
        setMessages(prev => [...prev, {sender: "olsme-user", text: "That's an interesting point."}])
    }, 1500)

    const conversationHistory = newMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
    const prompt = await getPolitenessPrompt(conversationHistory);
    setPolitenessPrompt(prompt);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="p-4 border-b">
        <h3 className="font-semibold text-center">Chat</h3>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-[400px] lg:h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "You" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    message.sender === "You"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {politenessPrompt && (
        <div className="p-2 border-t text-sm text-muted-foreground bg-muted/50">
          <div className="flex items-center gap-2 container">
            <Sparkles className="w-4 h-4 text-secondary" />
            <p className="italic">{politenessPrompt}</p>
          </div>
        </div>
      )}
      <CardFooter className="p-2 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-start gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button type="submit" size="icon" aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
