import React from 'react';
import { 
  Layers, 
  UserCheck, 
  Users, 
  BookOpen, 
  FileText, 
  MessageSquare 
} from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'inquiries', label: 'Inquiries', icon: UserCheck },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'batches', label: 'Batches', icon: BookOpen },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'session-updates', label: 'Session Logs', icon: MessageSquare }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-900 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Institute Branding Emblem */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
            H
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">H.B.INSTITUTE</h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">ERP Suite</p>
          </div>
        </div>

        {/* Horizontal Scrollable Tabs Container */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar scroll-smooth pb-1 sm:pb-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap border shrink-0 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-indigo-600' 
                    : 'text-gray-500 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;