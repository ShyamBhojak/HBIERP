import React from 'react';
import { Calendar, Users, MapPin, CheckCircle2, X, TrendingUp } from 'lucide-react';

const DashboardView = ({ stats, globalMonth, setGlobalMonth, monthOptions, students, setSelectedStatuses, setActiveTab, setSelectedStatus }) => {
  const statCards = [
    {
      label: 'Total Enquiries', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/5',
      action: () => { setSelectedStatuses([]); setGlobalMonth(globalMonth); setActiveTab('leads'); }
    },
    {
      label: 'Total Visits', value: stats.visited, icon: MapPin, color: 'text-orange-400', bg: 'bg-orange-400/5',
      action: () => { setSelectedStatuses(['Visited']); setGlobalMonth(globalMonth); setActiveTab('leads'); }
    },
    {
      label: 'Enrolled Today', value: stats.enrolled, icon: CheckCircle2, color: 'text-indigo-400', bg: 'bg-indigo-400/5',
      action: () => { setSelectedStatuses(['Enrolled']); setGlobalMonth(globalMonth); setActiveTab('leads'); }
    },
    {
      label: 'Closed', value: stats.closed, icon: X, color: 'text-red-400', bg: 'bg-indigo-400/5',
      action: () => { setSelectedStatuses(['Closed']); setGlobalMonth(globalMonth); setActiveTab('leads'); }
    },
    {
      label: 'Active Students', value: students.filter(s => s.status === 'Active').length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/5',
      action: () => { setSelectedStatus('Active'); setGlobalMonth(globalMonth); setActiveTab('students'); }
    },
    { label: 'Conversion rate', value: `${stats.conversion}%`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/5' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Calendar className="text-indigo-500" size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">Performance Period:</span>
        </div>
        <select
          className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-xs font-bold appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-600"
          value={globalMonth}
          onChange={e => setGlobalMonth(e.target.value)}
        >
          {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((s, i) => (
          <div key={i} onClick={s.action} className="p-6 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 flex flex-col justify-between h-44 bg-gray-50 dark:bg-gray-900 transition-transform hover:scale-[1.02] cursor-pointer">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={s.color} size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-500 mb-1">{s.label}</p>
              <h3 className="text-4xl font-black">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardView;