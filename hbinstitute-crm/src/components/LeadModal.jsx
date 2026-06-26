import React from 'react';
import { X } from 'lucide-react';
import { COURSES, PLATFORMS } from '../constants/options';

const LeadModal = ({ editingLead, closeLeadModal, handleSaveLead, newLead, setNewLead }) => {
  
  const toggleCourseSelection = (course) => {
    const currentCourses = newLead.courses || [];
    if (currentCourses.includes(course)) {
      setNewLead({
        ...newLead,
        courses: currentCourses.filter(c => c !== course)
      });
    } else {
      setNewLead({
        ...newLead,
        courses: [...currentCourses, course]
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950">
          <div>
            <h3 className="text-2xl font-black tracking-tighter uppercase">{editingLead ? 'Update Inquiry' : 'New Inquiry'}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">H.B.INSTITUTE Database</p>
          </div>
          <button onClick={closeLeadModal} type="button" className="p-3 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-2xl transition-all"><X /></button>
        </div>
        <form onSubmit={handleSaveLead} className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Student Name</label>
              <input required className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600 transition-all outline-none" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="Full Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Mobile No</label>
              <input required type="tel" className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600 transition-all outline-none" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+91 XXXX" />
            </div>
          </div>

          {/* REVISED: Multi-Course Select Chip Interface Panel */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
              Interest Courses (Select Multiple — {(newLead.courses || []).length} Selected)
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl max-h-36 overflow-y-auto">
              {COURSES.map(c => {
                const isSelected = (newLead.courses || []).includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCourseSelection(c)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    {c} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Platforms</label>
            <select className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer outline-none" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Inquiry Priority</label>
            <div className="flex gap-3">
              {['Low', 'Medium', 'High'].map(p => (
                <button
                  key={p} type="button" onClick={() => setNewLead({ ...newLead, priority: p })}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newLead.priority === p ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Remarks / Background</label>
            <textarea className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600 outline-none h-28 resize-none" placeholder="e.g. BCA Semester 2 student, looking for summer training..." value={newLead.remarks} onChange={e => setNewLead({ ...newLead, remarks: e.target.value })} />
          </div>

          <button type="submit" className="w-full bg-indigo-600 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] transition-all">
            {editingLead ? 'Save Changes' : 'Add to Pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;