import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, IndianRupee, Tag, BookOpen } from 'lucide-react';
import { TIME_SLOTS } from '../constants/options';

const ConvertLeadModal = ({ isOpen, onClose, lead, onConfirm, faculty }) => {
  const [totalFee, setTotalFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [batchFrom, setBatchFrom] = useState('');
  const [batchTo, setBatchTo] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedFacultyIds, setAssignedFacultyIds] = useState([]);
  const [assignedFacultyNames, setAssignedFacultyNames] = useState([]);

  useEffect(() => {
    if (lead) {
      setTotalFee('');
      setDiscount('');
      setBatchFrom(TIME_SLOTS && TIME_SLOTS.length > 0 ? TIME_SLOTS[0] : '');
      setBatchTo(TIME_SLOTS && TIME_SLOTS.length > 1 ? TIME_SLOTS[1] : '');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setAssignedFacultyIds([]);
      setAssignedFacultyNames([]);
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  // COMPATIBILITY FALLBACK: Read multi-courses safely
  const leadCourses = lead.courses || (lead.course ? [lead.course] : []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!batchFrom || !batchTo) {
      alert("Please select both start and end times for the batch.");
      return;
    }

    onConfirm({
      totalFee: totalFee || '0',
      discount: discount || '0',
      batchFrom,
      batchTo,
      joiningDate,
      assignedFacultyIds,
      assignedFacultyNames,
      // Pass the multi-course array payload directly into the conversion handler
      courses: leadCourses
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl relative space-y-4">

        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Convert to Student</h3>
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">Profile: {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* REVISED: Display the selected courses inherited from the inquiry */}
        <div className="space-y-1.5 bg-gray-50 dark:bg-gray-950 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/60">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
            <BookOpen size={12} /> Inherited Courses
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {leadCourses.map((c, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[10px] uppercase tracking-wide">
                {c}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1">
              <Calendar size={12} /> Joining Date
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1">
              <Clock size={12} /> Batch Timing Setup
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide px-1">From</span>
                <select
                  value={batchFrom}
                  onChange={e => setBatchFrom(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-semibold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="">Start Time</option>
                  {TIME_SLOTS && TIME_SLOTS.map(slot => (
                    <option key={`from_${slot}`} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide px-1">To</span>
                <select
                  value={batchTo}
                  onChange={e => setBatchTo(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-semibold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="">End Time</option>
                  {TIME_SLOTS && TIME_SLOTS.map(slot => (
                    <option key={`to_${slot}`} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1">
                <IndianRupee size={12} /> Total Course Fee
              </label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={totalFee}
                onChange={e => setTotalFee(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1">
                <Tag size={12} /> Discount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
              Assign Faculty Mentors (Select Multiple)
            </label>
            <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 space-y-2.5 max-h-36 overflow-y-auto">
              {faculty && faculty.map(f => {
                const isChecked = assignedFacultyIds.includes(f.id);
                return (
                  <label key={f.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setAssignedFacultyIds(assignedFacultyIds.filter(id => id !== f.id));
                          setAssignedFacultyNames(assignedFacultyNames.filter(name => name !== f.name));
                        } else {
                          setAssignedFacultyIds([...assignedFacultyIds, f.id]);
                          setAssignedFacultyNames([...assignedFacultyNames, f.name]);
                        }
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 border-gray-300 dark:bg-gray-900 dark:border-gray-700 focus:ring-indigo-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{f.name}</span>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wide">{f.designation}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
            >
              Confirm Enrollment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertLeadModal;