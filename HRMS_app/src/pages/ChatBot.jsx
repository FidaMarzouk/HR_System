import React, { useState, useEffect, useRef } from "react";
import { X, Send, Plus, Bot, Zap, Info, User as UserIcon, Minimize } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    if (isOpen && conversation.length === 0) {
      setConversation([
        {
          sender: "bot",
          text: "Hello! I'm your ENOVA Assistant. How can I help you with HR inquiries today?",
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, conversation.length]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    
    // Focus input when chat opens
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation, isOpen, isMinimized]);

  // Load conversation history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/chatbot/history", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.history && data.history.length > 0) {
            // Format history into conversation format
            const formattedHistory = data.history.map(msg => ({
              sender: msg.sender,
              text: msg.content,
              timestamp: new Date(msg.timestamp)
            }));
            
            setConversation(formattedHistory);
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };
    
    if (isOpen && conversation.length === 0) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = {
      sender: "user",
      text: message.trim(),
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    
    // Simulate typing effect
    setIsTyping(true);
    
    try {
     
      const response = await fetch("http://localhost:8080/api/chatbot/message", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify({ message: userMessage.text })
      });
      
      const data = await response.json();
      setIsTyping(false);
      
      if (data.success) {
        const botMessage = {
          sender: "bot",
          text: data.message,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, botMessage]);
      } else {
        // Handle error
        const errorMessage = {
          sender: "bot",
          text: data.message || "Sorry, I encountered an error processing your request. Please try again later.",
          timestamp: new Date()
        };
        setConversation(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
      const errorMessage = {
        sender: "bot",
        text: "Network error. Please check your connection and try again.",
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
    }
    
    setIsLoading(false);
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Updated quick prompts based on backend capabilities
  const quickPrompts = [
    // Leave-related prompts
    "How many leave days do I have left?",
    "My upcoming leave requests",
    "What types of leave can I take?",
    "How do I apply for leave?",
    "Has my leave request been approved?",
    
    // User and profile-related prompts
    "Show my profile information",
    "Who is my manager?",
    "Show my team members",
    "What department am I in?",
    
    // Meeting and schedule prompts
    "My upcoming meetings",
    "Today's schedule",
    "Who's in my department?",
    "Find a colleague",
    
    // Other frequently used prompts
    "Today's attendance",
    "Available resources",
    "Working hours policy",
    "How to reserve equipment"
  ];

  const handleQuickPrompt = (prompt) => {
    setMessage(prompt);
    // Focus on input after selecting prompt
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <>
      {/* Chatbot toggle button */}
      <button
        id="chatbot-toggle"
        onClick={toggleChatbot}
        className="fixed z-50 bottom-6 right-6 bg-[#23A49B] text-white p-4 rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(35,164,155,0.5)] duration-300 flex items-center justify-center"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Chatbot interface */}
      {isOpen && (
        <div
        className={`
          fixed z-50 bg-gray-900 shadow-2xl overflow-hidden transition-all duration-300 border-[#23A49B]/30 backdrop-blur-xl
          inset-x-0 bottom-0 rounded-t-2xl border-t
          ${isMinimized ? 'h-16' : 'h-5/6 max-h-screen'}

          md:inset-x-auto md:right-6 md:bottom-24 md:rounded-2xl md:border
          md:${isMinimized ? 'h-16' : 'h-auto'}
          w-full md:max-w-md
        `}
      >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex items-center justify-between border-b border-[#23A49B]/30">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#23A49B]/20 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#23A49B]" />
              </div>
              <h3 className="font-medium text-white">ENOVA Assistant</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={toggleMinimize}
                className="p-1 hover:bg-gray-700 rounded-full"
              >
                {isMinimized ? 
                  <Plus className="w-4 h-4 text-gray-400" /> : 
                  <Minimize className="w-4 h-4 text-gray-400 md:hidden" />
                }
                {!isMinimized && <Minimize className="w-4 h-4 text-gray-400" />}
              </button>
              <button
                onClick={toggleChatbot}
                className="p-1 hover:bg-gray-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message container */}
              <div className="p-4 h-3/4 overflow-y-auto bg-gray-800/60 space-y-4 scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-teal hover:scrollbar-thumb-teal-dark">
                {conversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] p-3 rounded-lg ${
                        msg.sender === "user"
                          ? "bg-[#23A49B] text-white rounded-tr-none"
                          : "bg-gray-700 text-gray-100 rounded-tl-none"
                      }`}
                    >
                      <div className="flex items-center mb-1 space-x-2">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center">
                          {msg.sender === "user" ? (
                            <UserIcon className="w-3 h-3 text-white/80" />
                          ) : (
                            <Bot className="w-3 h-3 text-gray-300" />
                          )}
                        </div>
                        <span className="text-xs opacity-70">
                          {msg.sender === "user" ? "You" : "ENOVA Assistant"}
                        </span>
                      </div>
                      <div className="text-sm break-words">
                        <ReactMarkdown>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-xs opacity-50">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts - with scrollbar */}
              <div className="p-2 bg-gray-900 border-t border-[#23A49B]/20 overflow-x-auto scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-teal hover:scrollbar-thumb-teal-dark">
                <div className="flex space-x-2 pb-1">
                  {quickPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="flex-shrink-0 px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input area */}
              <div className="p-3 bg-gray-900 border-t border-[#23A49B]/20">
                <div className="flex items-center space-x-2">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-800 text-gray-200 rounded-lg p-3 resize-none h-10 max-h-24 focus:outline-none focus:ring-1 focus:ring-[#23A49B] placeholder-gray-500 scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-teal"
                    style={{ minHeight: "40px" }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !message.trim()}
                    className={`p-2 rounded-full ${
                      isLoading || !message.trim()
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-[#23A49B] text-white hover:bg-[#1b8c84]"
                    } transition-colors`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  <span className="md:hidden">ENOVA HRMS | <span className="text-[#23A49B]">AI</span></span>
                  <span className="hidden md:inline">Powered by ENOVA HRMS | <span className="text-[#23A49B]">AI Assistant</span></span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatBot;