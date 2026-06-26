import React, { useState } from 'react';
import { X, FileText, Calendar, BookOpen } from 'lucide-react';
import { COURSES } from '../constants/options';

const AssignmentModal = ({ closeAssignmentModal, handleSaveAssignment }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState(COURSES[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSaveAssignment({
      title,
      description,
      course,
      dueDate,
      submissions: {} // Track mappings of studentId -> 'Pending' | 'Completed'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">Create New Assignment</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Academic Track System</p>
          </div>
          <button onClick={closeAssignmentModal} className="p-2.5 bg-gray-100 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form Contents Wrapper */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Assignment Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <FileText size={12}/> Task Assignment Title
            </label>
            <input 
              required 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Practice Set 1 - Array Matrices, OOP Concepts"
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Target Course Stream Select Button Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <BookOpen size={12}/> Target Course
              </label>
              <select
                value={course}
                onChange={e => setCourse(e.target.value)}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Target Deadline Date Fields Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Calendar size={12}/> Submission Deadline
              </label>
              <input 
                required
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description Details Panel */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assignment Guidelines / Problem Statements</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Write execution steps, reference files, guidelines or specific project submission problems rules here..."
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 outline-none h-24 resize-none font-semibold focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Execution Button Action triggers */}
          <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all pt-3">
            Deploy Assignment Task
          </button>

        </form>
      </div>
    </div>
  );
};

export default AssignmentModal;