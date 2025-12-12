import React, { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Onboarding from './components/Onboarding';
import { UserProfile, FoodLogEntry } from './types';
import { MoreVertical, Phone, Video } from 'lucide-react';

// Main App
const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('fit_track_profile');
      const savedLogs = localStorage.getItem('fit_track_logs');

      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        // Hydrate date strings back to Date objects
        const hydratedLogs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setFoodLogs(hydratedLogs);
      }
    } catch (error) {
      console.error("Failed to load data from local storage", error);
    }
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('fit_track_profile', JSON.stringify(profile));
  };

  const handleLogFood = (entry: FoodLogEntry) => {
    const newLogs = [...foodLogs, entry];
    setFoodLogs(newLogs);
    localStorage.setItem('fit_track_logs', JSON.stringify(newLogs));
  };
  
  const handleReset = () => {
     if(confirm('לאפס את כל הנתונים ולהתחיל מחדש?')) {
         localStorage.clear();
         window.location.reload();
     }
  };

  // If no profile, show Onboarding
  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex justify-center bg-[#d1d7db] min-h-screen h-screen font-sans">
      <div className="w-full max-w-md bg-[#efeae2] shadow-2xl h-full flex flex-col relative overflow-hidden border-x border-gray-300">
        
        {/* WhatsApp Header */}
        <div className="bg-[#008069] text-white px-3 py-2 shadow-sm z-30 flex justify-between items-center h-[60px] shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-white/10 cursor-pointer">
               <img 
                 src="https://api.dicebear.com/9.x/avataaars/svg?seed=Noga&backgroundColor=c0aede&clothing=blazerAndShirt&eyes=happy" 
                 alt="Noga" 
                 className="w-full h-full object-cover" 
               />
             </div>
             <div className="flex flex-col justify-center cursor-pointer">
               <h1 className="font-semibold text-base leading-tight tracking-wide">Noga (Nutrition Coach)</h1>
               <p className="text-[13px] text-green-100 font-normal animate-fade-in leading-none mt-0.5">
                 {isBotTyping ? 'מקלידה...' : 'מחוברת'}
               </p>
             </div>
          </div>
          
          <div className="flex items-center gap-5 text-white pr-1">
             <Video className="w-5 h-5 opacity-90 cursor-pointer" />
             <Phone className="w-5 h-5 opacity-90 cursor-pointer" />
             <button onClick={handleReset} title="אפשרויות / איפוס">
                <MoreVertical className="w-5 h-5 opacity-90 cursor-pointer" />
             </button>
          </div>
        </div>

        {/* Content Area - Pure Chat */}
        <div className="flex-1 overflow-hidden relative bg-[#efeae2]">
             <Chat 
                userProfile={userProfile} 
                recentLogs={foodLogs} 
                onLogFood={handleLogFood} 
                onTypingChange={setIsBotTyping}
             />
        </div>
      </div>
    </div>
  );
};

export default App;