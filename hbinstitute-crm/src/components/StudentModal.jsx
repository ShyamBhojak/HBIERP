import React from 'react';
import { X } from 'lucide-react';
import { COURSES, TIME_SLOTS, STUDENT_STATUS } from '../constants/options';

const StudentModal = ({ editingStudent, setShowStudentModal, setEditingStudent, newStudent, setNewStudent, saveStudent }) => {
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

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Course</label>
            <select value={newStudent.course} onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-600">
              <option value="">Select Course</option>
              {COURSES.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Total Course Fee (₹)</label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={newStudent.totalFee || ''}
              onChange={(e) => setNewStudent({ ...newStudent, totalFee: e.target.value })}
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-600"
            />
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