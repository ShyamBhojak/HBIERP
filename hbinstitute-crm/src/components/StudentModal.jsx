import React from 'react';
import { X } from 'lucide-react';
import { COURSES, TIME_SLOTS, STUDENT_STATUS } from '../constants/options';

const StudentModal = ({ editingStudent, setShowStudentModal, setEditingStudent, newStudent, setNewStudent, saveStudent, faculty }) => {

  // const toggleCourseSelection = (courseName) => {
  //   const currentCourses = newStudent.courses || [];
  //   const courseObj = currentCourses.find(item => (typeof item === 'object' ? item.name : item) === courseName);
  //   const isSelected = !!courseObj;

  //   if (isSelected) {
  //     const updated = currentCourses.filter(item => (typeof item === 'object' ? item.name : item) !== courseName);
  //     setNewStudent({ ...newStudent, courses: updated });
  //   } else {
  //     setNewStudent({ ...newStudent, courses: [...currentCourses, { name: courseName, remark: '' }] });
  //   }
  // };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950">
          <div>
            <h3 className="text-2xl font-black tracking-tighter uppercase">{editingStudent ? 'Update Student' : 'Add Student'}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">H.B.INSTITUTE Student Database</p>
          </div>
          <button onClick={() => { setShowStudentModal(false); setEditingStudent(null); }} className="p-3 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-2xl transition-all"><X /></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Student Name</label>
              <input required value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="Full Name" className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Mobile Number</label>
              <input required value={newStudent.mobile} onChange={(e) => setNewStudent({ ...newStudent, mobile: e.target.value })} placeholder="+91 XXXXX XXXXX" className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-600" />
            </div>
          </div>

          {/* NEW: Student Email Address Input Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Google Email Address (Required for Portal Login)</label>
            <input required type="email" value={newStudent.email || ''} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} placeholder="student.name@gmail.com" className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-600 text-xs font-semibold" />
          </div>

          {/* Interest Courses & Optional Remarks */}
          {/* NEW: Multi-Course Select Chips (Remarks completely removed) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
              Enrollment Courses (Select Multiple — {(newStudent.courses || []).length} Selected)
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl max-h-32 overflow-y-auto">
              {COURSES.map(course => {
                // Safely check array inclusion handling string values
                const currentCourses = newStudent.courses || [];
                const isSelected = currentCourses.includes(course);

                return (
                  <button
                    key={course}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        const updated = currentCourses.filter(c => c !== course);
                        setNewStudent({ ...newStudent, courses: updated });
                      } else {
                        setNewStudent({ ...newStudent, courses: [...currentCourses, course] });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${isSelected
                        ? 'bg-green-600 border-green-500 text-white shadow-md'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                      }`}
                  >
                    {course} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Total Course Fee (₹)</label>
              <input type="number" placeholder="e.g. 15000" value={newStudent.totalFee || ''} onChange={(e) => setNewStudent({ ...newStudent, totalFee: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Discount Allowed (₹)</label>
              <input type="number" placeholder="e.g. 2000" value={newStudent.discount || ''} onChange={(e) => setNewStudent({ ...newStudent, discount: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Batch From</label>
              <select value={newStudent.batchFrom} onChange={(e) => setNewStudent({ ...newStudent, batchFrom: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4">
                <option value="">Select Time</option>
                {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Batch To</label>
              <select value={newStudent.batchTo} onChange={(e) => setNewStudent({ ...newStudent, batchTo: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4">
                <option value="">Select Time</option>
                {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assign Faculty Mentors (Select Multiple)</label>
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-2.5 max-h-40 overflow-y-auto">
              {faculty && faculty.map(f => {
                const isChecked = (newStudent.assignedFacultyIds || []).includes(f.id);
                return (
                  <label key={f.id} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={isChecked} onChange={() => {
                      const currentIds = newStudent.assignedFacultyIds || [];
                      const currentNames = newStudent.assignedFacultyNames || [];
                      let updatedIds = currentIds.includes(f.id) ? currentIds.filter(id => id !== f.id) : [...currentIds, f.id];
                      let updatedNames = currentNames.includes(f.name) ? currentNames.filter(name => name !== f.name) : [...currentNames, f.name];
                      setNewStudent({ ...newStudent, assignedFacultyIds: updatedIds, assignedFacultyNames: updatedNames });
                    }} className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-indigo-500 transition-colors">{f.name}</span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider">{f.designation} — {f.subjects?.join(', ')}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Joining Date</label>
              <input type="date" value={newStudent.joiningDate} onChange={(e) => setNewStudent({ ...newStudent, joiningDate: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Student Status</label>
              <select value={newStudent.status || 'Active'} onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4">
                {STUDENT_STATUS.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <button onClick={saveStudent} className="w-full bg-green-600 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-green-600/30 hover:bg-green-500 active:scale-[0.98] transition-all">
            {editingStudent ? 'Update Student' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentModal;