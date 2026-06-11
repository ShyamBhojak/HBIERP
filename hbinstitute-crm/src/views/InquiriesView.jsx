import React from 'react';
import { Search, Filter, Phone, Calendar as CalendarIcon, Megaphone, Edit3, Trash2, MessageSquare } from 'lucide-react';
import { STATUS_OPTIONS } from '../constants/options';
import { formatLongDate } from '../utils/helpers';

const InquiriesView = ({ searchQuery, setSearchQuery, globalMonth, setGlobalMonth, monthOptions, selectedStatuses, toggleStatusFilter, filteredLeads, startEdit, deleteLead, convertToStudent, updateLeadStatus, updateLeadRemarks }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
            placeholder="Search by name or phone or course..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <select
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-10 py-4 text-xs font-bold appearance-none cursor-pointer outline-none focus:border-indigo-500"
              value={globalMonth}
              onChange={e => setGlobalMonth(e.target.value)}
            >
              {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 self-center mr-2">Filter Status:</span>
        {STATUS_OPTIONS.map(status => (
          <button
            key={status}
            onClick={() => toggleStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedStatuses.includes(status)
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
              }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredLeads.map(lead => {
          const leadStatusArray = Array.isArray(lead.status) ? lead.status : [lead.status];
          return (
            <div key={lead.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 hover:border-gray-700 transition-all shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-black text-xl uppercase tracking-tighter">{lead.name}</h4>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border ${lead.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>{lead.priority}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                    <span className="flex items-center gap-2"><Phone size={14} className="text-indigo-500 dark:text-indigo-400" /> {lead.phone}</span>
                    <span className="flex items-center gap-2"><CalendarIcon size={14} /> {formatLongDate(lead.date)}</span>
                    <span className="font-bold text-gray-500 dark:text-gray-100">{lead.course}</span>
                    <span className="flex items-center gap-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider">
                      <Megaphone size={10} /> {lead.source || 'Direct'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(lead)} className="p-3 bg-gray-800 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => deleteLead(lead.id)} className="p-3 bg-gray-800 hover:bg-red-500/20 text-red-400 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                  {/* REVISED: Render Convert option ONLY if 'Enrolled' is active AND 'Converted' has not been assigned yet */}
                  {leadStatusArray.includes('Enrolled') && !leadStatusArray.includes('Converted') && (
                    <button onClick={() => convertToStudent(lead)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all whitespace-nowrap">
                      Convert To Student
                    </button>
                  )}

                  {/* REVISED: Show the enrollment confirmation badge ONLY if BOTH 'Enrolled' and 'Converted' tags are present */}
                  {leadStatusArray.includes('Enrolled') && leadStatusArray.includes('Converted') && (
                    <span className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-wider whitespace-nowrap">
                      🎉 Student Enrolled
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-2 rounded-2xl">
                  {STATUS_OPTIONS.map(st => {
                    const isActive = leadStatusArray.includes(st);
                    const statusTimestamp = lead.statusHistory && lead.statusHistory[st];
                    return (
                      <button
                        key={st}
                        onClick={() => updateLeadStatus(lead.id, lead.status, st)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-0.5 min-w-[90px] ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-50 dark:bg-gray-900'
                          }`}
                      >
                        <span>{st}</span>
                        {isActive && statusTimestamp && (
                          <span className="text-[8px] font-medium opacity-90 block border-t border-white/20 pt-0.5 mt-0.5 text-center w-full">
                            {statusTimestamp}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <MessageSquare className="absolute left-4 top-4 text-indigo-500" size={16} />
                  <textarea
                    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3 text-xs text-gray-400 italic outline-none focus:border-indigo-600 transition-colors h-16 resize-none"
                    placeholder="Write inquiry remarks/notes here..."
                    defaultValue={lead.remarks}
                    onBlur={(e) => updateLeadRemarks(lead.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {filteredLeads.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-gray-900 rounded-[3rem]">
            <Search className="mx-auto text-gray-800 mb-4" size={48} />
            <p className="text-gray-600 font-bold">No matching inquiries found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InquiriesView;