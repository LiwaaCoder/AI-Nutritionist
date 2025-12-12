import React, { useState } from 'react';
import { UserProfile, Gender, ActivityLevel, FitnessGoal } from '../types';
import { Target, User, Ruler, Weight, Activity, Dumbbell, Zap } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    age: 30,
    gender: 'female',
    weight: 70,
    height: 165,
    activityLevel: 'moderate',
    fitnessGoal: 'lose_weight',
    goals: {
      calories: 2000,
      protein: 140,
      carbs: 180,
      fats: 60
    }
  });

  const calculateRecommendedGoals = () => {
    // Mifflin-St Jeor Equation
    const weight = formData.weight || 70;
    const height = formData.height || 165;
    const age = formData.age || 30;
    const gender = formData.gender || 'female';

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += gender === 'male' ? 5 : -161;

    // Activity Multiplier
    let multiplier = 1.2; // Sedentary
    switch(formData.activityLevel) {
      case 'light': multiplier = 1.375; break;
      case 'moderate': multiplier = 1.55; break;
      case 'active': multiplier = 1.725; break;
      case 'very_active': multiplier = 1.9; break;
      default: multiplier = 1.2;
    }

    let tdee = bmr * multiplier;
    let targetCalories = tdee;

    // Goal Adjustment
    if (formData.fitnessGoal === 'lose_weight') targetCalories -= 500;
    if (formData.fitnessGoal === 'gain_muscle') targetCalories += 300;

    // Safety floors
    if (gender === 'female' && targetCalories < 1200) targetCalories = 1200;
    if (gender === 'male' && targetCalories < 1500) targetCalories = 1500;

    // Macro Calculation
    // Protein: ~1.8-2.0g per kg for weight loss/muscle gain
    let proteinPerKg = formData.fitnessGoal === 'maintain' ? 1.6 : 2.0;
    let protein = weight * proteinPerKg;

    // Fat: ~0.9g per kg
    let fats = weight * 0.9;

    // Carbs: Remainder
    let proteinCals = protein * 4;
    let fatCals = fats * 9;
    let remainingCals = targetCalories - proteinCals - fatCals;
    let carbs = remainingCals > 0 ? remainingCals / 4 : 50; // Minimum floor

    setFormData(prev => ({
      ...prev,
      goals: {
        calories: Math.round(targetCalories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fats: Math.round(fats)
      }
    }));
  };

  const handleNext = () => {
    if (step === 3) {
      calculateRecommendedGoals();
      setStep(4);
    } else if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete({
        ...formData,
        onboardingComplete: true
      } as UserProfile);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600 mb-2">ברוכים הבאים</h1>
          <p className="text-gray-500">בואו נגדיר את הפרופיל שלך כדי שה-AI יוכל לעזור לך להשיג את המטרות.</p>
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-green-500" />
              פרטים אישיים
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                placeholder="ישראל ישראלי"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">גיל</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">מין</label>
                <select 
                   value={formData.gender}
                   onChange={(e) => setFormData({...formData, gender: e.target.value as Gender})}
                   className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="male">זכר</option>
                  <option value="female">נקבה</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Measurements */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-green-500" />
               מדידות גוף
            </h2>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">משקל (ק״ג)</label>
               <div className="relative">
                  <Weight className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="number" 
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-green-500"
                  />
               </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">גובה (ס״מ)</label>
               <div className="relative">
                  <Ruler className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="number" 
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-green-500"
                  />
               </div>
            </div>
          </div>
        )}

        {/* Step 3: Activity & Goals (NEW) */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in h-[400px] overflow-y-auto no-scrollbar">
             <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
               פעילות ומטרות
            </h2>
            
            <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">מה רמת הפעילות שלך?</label>
               <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: 'sedentary', label: 'יושבני', desc: 'מעט מאוד פעילות' },
                    { val: 'light', label: 'קלה', desc: 'אימון 1-3 פעמים בשבוע' },
                    { val: 'moderate', label: 'בינונית', desc: 'אימון 3-5 פעמים בשבוע' },
                    { val: 'active', label: 'פעילה', desc: 'אימון 6-7 פעמים בשבוע' },
                    { val: 'very_active', label: 'גבוהה מאוד', desc: 'עבודה פיזית / ספורטאי' },
                  ].map((opt) => (
                    <div 
                      key={opt.val}
                      onClick={() => setFormData({...formData, activityLevel: opt.val as ActivityLevel})}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                        formData.activityLevel === opt.val ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                       <div>
                         <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                         <div className="text-xs text-gray-500">{opt.desc}</div>
                       </div>
                       {formData.activityLevel === opt.val && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-2 pt-2">
               <label className="block text-sm font-medium text-gray-700">מה המטרה העיקרית?</label>
               <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: 'lose_weight', label: 'ירידה במשקל', icon: <Zap className="w-4 h-4" /> },
                    { val: 'maintain', label: 'שמירה על הקיים', icon: <Target className="w-4 h-4" /> },
                    { val: 'gain_muscle', label: 'עלייה במסת שריר', icon: <Dumbbell className="w-4 h-4" /> },
                  ].map((opt) => (
                    <div 
                      key={opt.val}
                      onClick={() => setFormData({...formData, fitnessGoal: opt.val as FitnessGoal})}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-3 ${
                        formData.fitnessGoal === opt.val ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                       <div className={`${formData.fitnessGoal === opt.val ? 'text-green-600' : 'text-gray-400'}`}>
                         {opt.icon}
                       </div>
                       <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* Step 4: Final Goals Review (Previously Step 3) */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              התוכנית שלך
            </h2>
            <div className="bg-green-50 p-4 rounded-lg mb-4 text-sm text-green-800 leading-relaxed">
               חישבנו עבורך את המטרות על בסיס הנתונים שלך.
               <br />
               <b>מטרה:</b> {formData.fitnessGoal === 'lose_weight' ? 'ירידה במשקל' : formData.fitnessGoal === 'gain_muscle' ? 'עלייה במסת שריר' : 'שמירה על משקל'}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">קלוריות (kcal)</label>
                <input 
                  type="number" 
                  value={formData.goals?.calories}
                  onChange={(e) => setFormData({...formData, goals: {...formData.goals!, calories: parseInt(e.target.value)}})}
                  className="w-full p-2 border rounded font-bold text-gray-700"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">חלבון (g)</label>
                <input 
                  type="number" 
                  value={formData.goals?.protein}
                  onChange={(e) => setFormData({...formData, goals: {...formData.goals!, protein: parseInt(e.target.value)}})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">פחמימות (g)</label>
                <input 
                  type="number" 
                  value={formData.goals?.carbs}
                  onChange={(e) => setFormData({...formData, goals: {...formData.goals!, carbs: parseInt(e.target.value)}})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">שומן (g)</label>
                <input 
                  type="number" 
                  value={formData.goals?.fats}
                  onChange={(e) => setFormData({...formData, goals: {...formData.goals!, fats: parseInt(e.target.value)}})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">חזור</button>
          ) : <div></div>}
          <button 
            onClick={handleNext}
            className="bg-green-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-green-700 transition shadow-md"
          >
            {step === 4 ? "סיום והתחלה" : "המשך"}
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-2 rounded-full ${step >= i ? 'bg-green-500' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;