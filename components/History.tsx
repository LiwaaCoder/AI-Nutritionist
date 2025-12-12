import React from 'react';
import { FoodLogEntry } from '../types';
import { Utensils } from 'lucide-react';

interface Props {
  logs: FoodLogEntry[];
}

const History: React.FC<Props> = ({ logs }) => {
  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Group logs by date string
  const groupedLogs = sortedLogs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, FoodLogEntry[]>);

  return (
    <div className="p-4 space-y-4 pb-20">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Utensils className="w-6 h-6 text-green-600" />
        היסטוריית ארוחות
      </h2>

      {Object.keys(groupedLogs).length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p>לא נמצאו ארוחות רשומות.</p>
          <p className="text-sm">התחל לרשום ארוחות בצ'אט!</p>
        </div>
      ) : (
        Object.entries(groupedLogs).map(([date, dayLogs]) => (
          <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-gray-700 text-sm">{date}</span>
              <span className="text-xs text-gray-500 font-medium bg-gray-200 px-2 py-1 rounded-full">
                {dayLogs.reduce((sum, log) => sum + log.calories, 0)} kcal
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {dayLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{log.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">{log.calories} kcal</div>
                    <div className="text-[10px] text-gray-400 flex gap-2 mt-1 justify-end">
                       <span title="חלבון">P: {log.protein}g</span>
                       <span title="פחמימות">C: {log.carbs}g</span>
                       <span title="שומן">F: {log.fats}g</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default History;