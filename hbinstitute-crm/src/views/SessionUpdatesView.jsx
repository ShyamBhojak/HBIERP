import React, { useState, useMemo } from 'react';
import { Search, Calendar, Clock, User, MessageSquare, Plus, Trash2, Edit3 } from 'lucide-react';

const SessionUpdatesView = ({ sessionUpdates, deleteSessionUpdate, setIsAddingSession, startEditSession }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    return sessionUpdates.filter(s =>
      s.facultyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topicsCovered?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.batchSlot?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessionUpdates, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search & Action Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/5 text-indigo-500 flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Session Logs</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{sessionUpdates.length} Classes Recorded</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by topic, faculty, batch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-semibold outline-none"
            />
          </div>
          <button
            onClick={() => setIsAddingSession(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 px-5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} /> Log Session
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-4 pl-6 space-y-6 pb-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className="relative group animate-fadeIn">
            <span className="absolute -left-[31px] top-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-950 bg-indigo-600" />

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {session.course}
                    </span>
                    <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 px-2.5 py-1 rounded-md uppercase tracking-wide flex items-center gap-1">
                      <Clock size={11} /> {session.batchSlot}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">Topics Covered</h4>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-100 dark:border-gray-850">
                      {session.topicsCovered}
                    </p>
                  </div>
                  {/* NEW: Displays the Attending Roster Badges */}
                  <div className="pt-1.5">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">👥 Attending Students</h4>
                    <div className="flex flex-wrap gap-1">
                      {session.assignedStudentNames && session.assignedStudentNames.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded text-[9px] uppercase border border-indigo-500/10">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 text-[11px] text-gray-400 font-bold pt-1">
                    <span className="flex items-center gap-1.5"><User size={13} /> Conducted By: <span className="text-gray-600 dark:text-gray-300">{session.facultyName}</span></span>
                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {session.date}</span>
                  </div>
                </div>

                {/* Card Control Actions */}
                <div className="flex sm:opacity-0 group-hover:opacity-100 gap-1 transition-all">
                  <button
                    onClick={() => startEditSession(session)}
                    className="p-2 text-gray-400 hover:text-indigo-500 rounded-lg transition-all"
                    title="Edit Log"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => deleteSessionUpdate(session.id)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                    title="Remove Log"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] relative -left-6">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={44} />
            <p className="text-gray-500 font-bold">No classroom session updates found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionUpdatesView;