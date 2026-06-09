import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  LayoutDashboard, Users, User, CheckCircle2, TrendingUp, 
  Calendar, BookOpen, Megaphone, ChevronRight, ChevronLeft, LogOut 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, setIsMobileMenuOpen, user }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'leads', icon: Users, label: 'Inquiries' },
    { id: 'students', icon: User, label: 'Students' },
    { id: 'attendance', icon: CheckCircle2, label: 'Attendance' },
    { id: 'fees', icon: TrendingUp, label: 'Fees' },
    { id: 'batches', icon: Calendar, label: 'Batches' },
    { id: 'faculty', icon: Users, label: 'Faculty' },
    { id: 'assignments', icon: BookOpen, label: 'Assignments' },
    { id: 'social', icon: Megaphone, label: 'Social Hub' }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 shrink-0">
        <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="bg-indigo-600 p-2 rounded-xl">
            <BookOpen className="text-white" size={24} />
          </div>
          {!isCollapsed && <span className="font-black text-lg tracking-tighter">H.B.INSTITUTE</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <nav className="space-y-2 pb-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-300'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon size={22} />
              {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex w-full items-center gap-4 px-4 py-3 text-gray-500 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
        >
          {isCollapsed ? <ChevronRight /> : <><ChevronLeft /><span className="text-xs font-bold uppercase tracking-widest">Collapse</span></>}
        </button>

        <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl ${isCollapsed ? 'justify-center' : ''}`}>
          {user?.photoURL ? (
            <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><User size={16} /></div>
          )}
          {!isCollapsed && <div className="truncate"><p className="text-xs font-bold truncate">{user?.displayName || 'Guest User'}</p></div>}
        </div>

        <button
          onClick={() => signOut(auth)}
          className={`w-full flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-bold text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;