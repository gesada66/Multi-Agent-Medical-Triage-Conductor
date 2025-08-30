'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { nhsColors } from '@/components/ui/nhs-design-system';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  urgent?: boolean;
  actions?: Array<{
    label: string;
    action: string;
    variant?: 'emergency' | 'urgent' | 'normal';
  }>;
}

export function ConversationalCarePartner() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your NHS Digital Health Assistant. I'm here to help assess your symptoms and guide you to the right care. Everything you tell me is confidential and secure. How are you feeling today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (in real app, this would call your triage API)
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const generateAIResponse = (userInput: string): Message => {
    const input = userInput.toLowerCase();
    
    // Emergency keywords detection
    const emergencyKeywords = ['chest pain', 'can\'t breathe', 'severe pain', 'unconscious', 'bleeding'];
    const isEmergency = emergencyKeywords.some(keyword => input.includes(keyword));
    
    if (isEmergency) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I'm concerned about the symptoms you've described. This sounds like it needs immediate medical attention. Please don't wait - you should seek emergency care right now.",
        timestamp: new Date(),
        urgent: true,
        actions: [
          { label: '🚨 Call 999 (Emergency)', action: 'call_999', variant: 'emergency' },
          { label: '🏥 Find Nearest A&E', action: 'find_ae', variant: 'emergency' },
          { label: '📞 Call 111 for Guidance', action: 'call_111', variant: 'urgent' }
        ]
      };
    }

    // Moderate symptoms
    const moderateKeywords = ['headache', 'fever', 'cough', 'stomach pain'];
    const isModerate = moderateKeywords.some(keyword => input.includes(keyword));
    
    if (isModerate) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I understand you're experiencing some concerning symptoms. To help me give you the best guidance, can you tell me: How long have you had these symptoms? On a scale of 1-10, how would you rate the severity? Have you tried any treatments at home?",
        timestamp: new Date(),
        actions: [
          { label: '📞 Speak to Nurse (111)', action: 'call_111', variant: 'normal' },
          { label: '🏥 Find Local Services', action: 'find_services', variant: 'normal' }
        ]
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'assistant',  
      content: "Thank you for sharing that with me. To better understand your situation and provide the most appropriate guidance, could you tell me a bit more about your symptoms? For example: When did they start? How severe are they? Have you experienced anything like this before?",
      timestamp: new Date()
    };
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'call_999':
        window.open('tel:999', '_self');
        break;
      case 'call_111':
        window.open('tel:111', '_self');
        break;
      case 'find_ae':
        window.open('https://www.nhs.uk/service-search/other-services/Accident-and-emergency-services/LocationSearch/428', '_blank');
        break;
      case 'find_services':
        window.open('https://www.nhs.uk/service-search/', '_blank');
        break;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* NHS Header */}
      <header className="bg-[#005EB8] text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="text-xl font-bold">NHS</div>
            <div className="border-l border-blue-300 pl-3">
              <h1 className="text-lg font-semibold">Digital Health Assistant</h1>
              <p className="text-sm text-blue-100">Secure • Confidential • Available 24/7</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl ${
                message.type === 'user' 
                  ? 'bg-[#005EB8] text-white rounded-l-2xl rounded-tr-2xl' 
                  : message.urgent
                  ? 'bg-red-50 border-l-4 border-red-500 rounded-r-2xl rounded-tl-2xl'
                  : 'bg-white border border-slate-200 rounded-r-2xl rounded-tl-2xl'
              } p-4 shadow-sm`}>
                
                {message.type === 'assistant' && (
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-[#005EB8] rounded-full flex items-center justify-center text-white text-sm font-medium mr-2">
                      NHS
                    </div>
                    <span className="text-sm font-medium text-slate-700">Digital Health Assistant</span>
                    {message.urgent && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs">Urgent</Badge>
                    )}
                  </div>
                )}
                
                <p className={`${
                  message.type === 'user' ? 'text-white' : message.urgent ? 'text-red-800' : 'text-slate-800'
                } text-base leading-relaxed`}>
                  {message.content}
                </p>
                
                {message.actions && (
                  <div className="mt-4 space-y-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={index}
                        onClick={() => handleAction(action.action)}
                        className={`w-full justify-start text-left ${
                          action.variant === 'emergency' 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : action.variant === 'urgent'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-[#005EB8] hover:bg-[#003087] text-white'
                        }`}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                <div className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-slate-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-r-2xl rounded-tl-2xl p-4 shadow-sm max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#005EB8] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    NHS
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe how you're feeling..."
                className="text-base py-3 px-4 border-slate-300 focus:border-[#005EB8]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-[#005EB8] hover:bg-[#003087] text-white px-6 py-3"
            >
              Send
            </Button>
          </div>
          
          {/* Safety Notice */}
          <div className="mt-3 text-center">
            <p className="text-xs text-slate-500">
              🔒 Your conversation is secure and confidential. 
              <strong className="text-red-600 ml-1">Call 999 immediately if you have a life-threatening emergency.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Emergency Access (Always Visible) */}
      <div className="bg-red-600 text-white p-2">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-sm">
          <span className="font-medium">🚨 Emergency? Don't wait</span>
          <div className="space-x-3">
            <Button 
              size="sm"
              onClick={() => window.open('tel:999')}
              className="bg-red-700 hover:bg-red-800 text-xs px-3 py-1"
            >
              Call 999
            </Button>
            <Button 
              size="sm"
              onClick={() => window.open('tel:111')}
              className="bg-red-700 hover:bg-red-800 text-xs px-3 py-1"
            >
              Call 111
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}