import React from 'react';
import { UserProfile, FoodLogEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  logs: FoodLogEntry[];
}

const Dashboard: React.FC<Props> = ({ userProfile, logs }) => {
  // Filter for today's logs
  const todayLogs = logs.filter(
    (log) => new Date(log.timestamp).toDateString() === new Date().toDateString()
  );

  const totals = todayLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const ProgressRing = ({ current, target, color, label, icon: Icon }: any) => {
    const percentage = Math.min(100, Math.max(0, (current / target) * 100));
    const data = [
      { name: 'Completed', value: current },
      { name: 'Remaining', value: Math.max(0, target - current) },
    ];
    
    return (
      <div className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex-1">
        <div className="text-gray-500 mb-1 text-xs font-medium flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <div className="relative h-20 w-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={35}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="#e5e7eb" />
              </Pie>
              <Tooltip formatter={(value: number) => value.toFixed(0)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
            {Math.round(percentage)}%
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          <span className="font-semibold text-gray-800">{Math.round(current)}</span> / {target}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
       {/* Big Calories Card */}
       <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-5">
            <Flame className="w-40 h-40" />
          </div>
          <div className="relative z-10">
            <h3 className="text-green-100 text-sm font-medium mb-1">קלוריות היום</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{Math.round(totals.calories)}</span>
              <span className="text-green-200 mb-1">/ {userProfile.goals.calories} kcal</span>
            </div>
            <div className="w-full bg-green-800/30 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (totals.calories / userProfile.goals.calories) * 100)}%` }}
              />
            </div>
          </div>
       </div>

       {/* Macros Grid */}
       <div className="flex gap-2 justify-between">
          <ProgressRing 
            current={totals.protein} 
            target={userProfile.goals.protein} 
            color="#3b82f6" 
            label="חלבון" 
            icon={Beef}
          />
          <ProgressRing 
            current={totals.carbs} 
            target={userProfile.goals.carbs} 
            color="#eab308" 
            label="פחמימות" 
            icon={Wheat}
          />
          <ProgressRing 
            current={totals.fats} 
            target={userProfile.goals.fats} 
            color="#ef4444" 
            label="שומן" 
            icon={Droplet}
          />
       </div>

       {/* Recent Logs List - Only show last 3 for brevity in dashboard */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">ארוחות אחרונות</h3>
          {todayLogs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">טרם נרשמו ארוחות היום.</p>
          ) : (
            <div className="space-y-3">
              {[...todayLogs].reverse().slice(0, 3).map((log) => (
                <div key={log.id} className="flex justify-between items-center border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{log.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    {log.calories} kcal
                  </div>
                </div>
              ))}
            </div>
          )}
       </div>
    </div>
  );
};

export default Dashboard;
