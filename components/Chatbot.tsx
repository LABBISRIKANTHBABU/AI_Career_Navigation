import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { LoadingSpinner, PaperAirplaneIcon, UserCircleIcon, SparklesIcon } from './icons';

interface ChatbotProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-brand-primary text-white">
          <SparklesIcon className="w-5 h-5" />
        </div>
      )}
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 text-sm md:text-base ${
          isUser
            ? 'bg-brand-primary text-white rounded-br-none'
            : 'bg-base-100 text-base-content rounded-bl-none'
        }`}
      >
        <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
      </div>
       {isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-base-300 text-base-content">
          <UserCircleIcon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};

export const Chatbot: React.FC<ChatbotProps> = ({ history, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div className="flex-grow overflow-y-auto pr-4 space-y-6">
        {history.map((msg, index) => (
          <ChatMessageBubble key={index} message={msg} />
        ))}
        {isLoading && history[history.length - 1]?.role === 'user' && (
             <div className="flex items-start gap-3">
                 <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-brand-primary text-white">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div className="bg-base-100 rounded-2xl px-4 py-3 rounded-bl-none">
                   <LoadingSpinner className="h-5 w-5 text-brand-primary" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-6 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="w-full bg-base-100 border border-base-300 rounded-lg p-3 pr-12 text-sm focus:ring-brand-primary focus:border-brand-primary transition disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-full text-base-content/60 hover:text-brand-primary disabled:hover:text-base-content/60 transition-colors duration-200 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
