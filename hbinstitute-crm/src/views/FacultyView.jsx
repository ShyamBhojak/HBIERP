import React, { useState, useMemo } from 'react';
import { Search, User, Mail, BookOpen, Trash2, Edit3, Phone } from 'lucide-react';

const FacultyView = ({ faculty, editFaculty, deleteFaculty, setIsAddingFaculty, students }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Live filter search logic
  const filteredFaculty = useMemo(() => {
    return faculty.filter(f =>
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.mobile?.includes(searchQuery) ||
      f.subjects?.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [faculty, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Control Search Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/5 text-indigo-500 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Faculty Management</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{faculty.length} Active Instructors</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search faculty name, subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-semibold outline-none"
            />
          </div>
          <button
            onClick={() => setIsAddingFaculty(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-5 rounded-xl uppercase tracking-wider whitespace-nowrap"
          >
            Add Faculty
          </button>
        </div>
      </div>

      {/* Faculty Cards Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFaculty.map((member) => (
          <div key={member.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">

                {/* REVISED: Profile Picture Container with Initials Fallback */}
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/20"
                    onError={(e) => {
                      // Fallback if image fails to load or link breaks
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-14 h-14 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-black text-sm"
                  style={{ display: member.photoUrl ? 'none' : 'flex' }}
                >
                  {member.name ? member.name.charAt(0).toUpperCase() : 'F'}
                </div>

                <div className="flex gap-1">
                  <button onClick={() => editFaculty(member)} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="Edit Profile"><Edit3 size={16} /></button>
                  <button onClick={() => deleteFaculty(member.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete Instructor"><Trash2 size={16} /></button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">{member.name}</h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{member.designation || 'Instructor'}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 font-semibold">
                <div className="flex items-center gap-2.5"><Phone size={14} className="text-gray-400" /> {member.mobile || 'N/A'}</div>
                <div className="flex items-center gap-2.5"><Mail size={14} className="text-gray-400" /> {member.email || 'N/A'}</div>
              </div>

              <div className="pt-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                  <BookOpen size={12} className="text-indigo-500" /> Assigned Subjects
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {member.subjects && member.subjects.map((sub, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300">
                      {sub}
                    </span>
                  ))}
                  {(!member.subjects || member.subjects.length === 0) && (
                    <span className="text-xs text-gray-400 italic">No modules assigned</span>
                  )}
                </div>
              </div>
              {/* Inside the faculty.map loop in FacultyView.jsx */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                  👥 Active Mapped Students ({
                    students.filter(s => s.status === 'Active' && s.assignedFacultyIds && s.assignedFacultyIds.includes(member.id)).length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {students.filter(s => s.status === 'Active' && s.assignedFacultyIds && s.assignedFacultyIds.includes(member.id)).map(std => (
                    <div key={std.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 p-2 rounded-lg border border-gray-100 dark:border-gray-800/60">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{std.name}</span>
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded uppercase">{std.course}</span>
                    </div>
                  ))}
                  {students.filter(s => s.status === 'Active' && s.assignedFacultyIds && s.assignedFacultyIds.includes(member.id)).length === 0 && (
                    <p className="text-[10px] text-gray-400 font-medium italic pl-1">No students assigned to this mentor yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50/30 dark:bg-gray-950/20 text-right">
              <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase">H.B. Institute Faculty</span>
            </div>
          </div>
        ))}
      </div>

      {filteredFaculty.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem]">
          <User className="mx-auto text-gray-400 mb-4" size={44} />
          <p className="text-gray-500 font-bold">No matching faculty profiles found.</p>
        </div>
      )}
    </div>
  );
};

export default FacultyView;