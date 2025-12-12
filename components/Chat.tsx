import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera, Mic, Paperclip, Smile } from 'lucide-react';
import { ChatMessage, MessageSender, FoodLogEntry, UserProfile } from '../types';
import { analyzeInput, fileToBase64 } from '../services/geminiService';

interface Props {
  userProfile: UserProfile;
  recentLogs: FoodLogEntry[];
  onLogFood: (entry: FoodLogEntry) => void;
  onTypingChange: (isTyping: boolean) => void;
}

const Chat: React.FC<Props> = ({ userProfile, recentLogs, onLogFood, onTypingChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: MessageSender.BOT,
      text: `היי ${userProfile.name}! 👋\nאני נוגה, מאמנת התזונה האישית שלך.\n\nשלחי לי תמונה 📸 או ספרי לי מה אכלת, ואני אדאג לכל החישובים.\nאנחנו נשיג את המטרות האלה ביחד! 💪`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    onTypingChange(isTyping);
  }, [isTyping, onTypingChange]);

  const handleSendMessage = async (text: string, file?: File) => {
    if (!text.trim() && !file) return;

    let imageBase64: string | undefined;
    if (file) {
      try {
        imageBase64 = await fileToBase64(file);
      } catch (err) {
        console.error("Failed to read file", err);
        return;
      }
    }

    // Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: MessageSender.USER,
      text: text,
      image: imageBase64,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const analysis = await analyzeInput(text, imageBase64, userProfile, recentLogs, messages);

      let foodLogEntry: FoodLogEntry | undefined;

      // Handle Result
      if (analysis.type === 'log' && analysis.logged_food) {
        foodLogEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          ...analysis.logged_food,
        };
        onLogFood(foodLogEntry);
      }

      // Add Bot Message
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: MessageSender.BOT,
        text: analysis.message,
        timestamp: new Date(),
        foodLog: foodLogEntry, // Attach food log for card rendering
      };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: MessageSender.BOT,
        text: 'מצטערת, נתקלתי בבעיה קטנה בחיבור. נסה שוב עוד רגע? 🙏',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSendMessage('', e.target.files[0]);
    }
  };

  // Helper for message timestamp formatting
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2] relative font-sans">
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-60 pointer-events-none" 
        style={{ 
          backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundSize: '412px'
        }}
      ></div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 z-10 no-scrollbar">
        {/* Date separator */}
        <div className="flex justify-center sticky top-2 z-20">
           <span className="bg-white/90 text-gray-600 text-[11px] px-3 py-1 rounded-lg shadow-sm backdrop-blur-sm border border-gray-100">
             היום
           </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.sender === MessageSender.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-lg p-1 shadow-sm text-sm ${
                msg.sender === MessageSender.USER
                  ? 'bg-[#E7FFDB] text-gray-900 rounded-tr-none' 
                  : 'bg-white text-gray-900 rounded-tl-none'
              }`}
            >
               {/* Tail SVG */}
               {msg.sender === MessageSender.USER ? (
                 <svg className="absolute top-0 -right-2 text-[#E7FFDB] fill-current" width="8" height="13" viewBox="0 0 8 13">
                   <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                 </svg>
               ) : (
                 <svg className="absolute top-0 -left-2 text-white fill-current" width="8" height="13" viewBox="0 0 8 13">
                   <path d="M-2.288 1h5.187v11.193l-6.467-8.625C-4.626 2.156 -4.058 1 -2.288 1z" transform="scale(-1, 1) translate(-3, 0)"></path>
                 </svg>
               )}

               {/* Image content */}
               {msg.image && (
                 <div className="p-1 mb-1">
                   <img src={msg.image} alt="Food" className="rounded-md w-full max-h-72 object-cover" />
                 </div>
               )}

               {/* Food Log Card */}
               {msg.foodLog && (
                 <div className="mb-2 mt-1 mx-1 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                   <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                     <h3 className="text-[#008069] font-bold text-sm mb-0.5 tracking-wide">
                       ניתוח ארוחה
                     </h3>
                     <div className="text-gray-800 text-base font-medium leading-tight">
                       {msg.foodLog.name}
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between p-3 bg-white">
                      <div className="text-center flex-1 border-l border-gray-100 pl-2">
                        <span className="block text-2xl font-bold text-gray-800 leading-none">{msg.foodLog.calories}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">kcal</span>
                      </div>
                      
                      <div className="flex gap-3 text-center px-2">
                         <div>
                            <div className="text-sm font-bold text-gray-700">{msg.foodLog.protein}g</div>
                            <div className="text-[10px] text-gray-400">חלבון</div>
                         </div>
                         <div>
                            <div className="text-sm font-bold text-gray-700">{msg.foodLog.carbs}g</div>
                            <div className="text-[10px] text-gray-400">פחמימה</div>
                         </div>
                         <div>
                            <div className="text-sm font-bold text-gray-700">{msg.foodLog.fats}g</div>
                            <div className="text-[10px] text-gray-400">שומן</div>
                         </div>
                      </div>
                   </div>
                 </div>
               )}

              {/* Text content */}
              {msg.text && (
                 <div className="px-2 pt-1 pb-1 whitespace-pre-wrap leading-relaxed text-[15px] text-[#111b21]">
                   {msg.text}
                 </div>
              )}

              {/* Timestamp and Checkmarks */}
              <div className="flex justify-end items-center gap-1 px-1 -mt-1 pb-0.5 select-none">
                <span className="text-[10px] text-gray-500 font-light">{formatTime(msg.timestamp)}</span>
                {msg.sender === MessageSender.USER && (
                  <span className="text-[#53bdeb]">
                    <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet" className="" version="1.1" x="0px" y="0px" enableBackground="new 0 0 16 11">
                      <path fill="currentColor" d="M4 10.5L0 6.5L1.5 5L4 7.5L4.5 7L10.5 1L12 2.5L4 10.5Z"></path>
                      <path fill="currentColor" d="M8 10.5L4 6.5L5.5 5L8 7.5L8.5 7L14.5 1L16 2.5L8 10.5Z"></path>
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start w-full">
             <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm flex items-center gap-1 relative ml-2">
                <svg className="absolute top-0 -left-2 text-white fill-current" width="8" height="13" viewBox="0 0 8 13">
                   <path d="M-2.288 1h5.187v11.193l-6.467-8.625C-4.626 2.156 -4.058 1 -2.288 1z" transform="scale(-1, 1) translate(-3, 0)"></path>
                 </svg>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] px-2 py-2 flex items-end gap-2 z-20 pb-safe">
        <div className="bg-white rounded-2xl flex-1 flex items-center px-2 py-1 shadow-sm border border-gray-100 min-h-[44px]">
           <button 
            className="p-1.5 text-gray-400 hover:text-gray-600 transition"
           >
             <Smile className="w-6 h-6" />
           </button>
           <input
             type="text"
             value={inputText}
             onChange={(e) => setInputText(e.target.value)}
             onKeyDown={handleKeyPress}
             placeholder="הודעה"
             className="flex-1 bg-transparent focus:outline-none text-gray-700 text-base mx-2 py-2 max-h-24 overflow-y-auto"
             disabled={isTyping}
             dir="auto"
           />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="p-1.5 text-gray-400 hover:text-gray-600 transition transform rotate-45"
           >
             <Paperclip className="w-5 h-5" />
           </button>
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="p-1.5 text-gray-400 hover:text-gray-600 transition mr-1"
           >
             <Camera className="w-5 h-5" />
           </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileSelect}
        />
        
        <button 
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() && !fileInputRef.current?.files?.length && isTyping}
          className={`p-3 rounded-full shadow-sm transition flex items-center justify-center h-[44px] w-[44px] ${
            inputText.trim() ? 'bg-[#008069] text-white hover:bg-[#006d59]' : 'bg-[#008069] text-white'
          }`}
        >
          {inputText.trim() ? <Send className="w-5 h-5 ml-0.5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Chat;