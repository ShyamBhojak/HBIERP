import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, IndianRupee, Tag } from 'lucide-react';
// Import TIME_SLOTS array from your options file
import { TIME_SLOTS } from '../constants/options';

const ConvertLeadModal = ({ isOpen, onClose, lead, onConfirm }) => {
  const [totalFee, setTotalFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [batchFrom, setBatchFrom] = useState('');
  const [batchTo, setBatchTo] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (lead) {
      setTotalFee('');
      setDiscount('');
      setBatchFrom(TIME_SLOTS && TIME_SLOTS.length > 0 ? TIME_SLOTS[0] : '');
      setBatchTo(TIME_SLOTS && TIME_SLOTS.length > 1 ? TIME_SLOTS[1] : '');
      setJoiningDate(new Date().toISOString().split('T')[0]);
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

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
      joiningDate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl relative space-y-4">
        
        {/* Header Strip */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Convert to Student</h3>
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">Profile: {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Joining Date */}
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

          {/* Batch Timings Dropdown Selectors Group */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1">
              <Clock size={12} /> Batch Timing Setup
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Batch From Selection Selector */}
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

              {/* Batch To Selection Selector */}
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

          {/* Financial Fields */}
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

          {/* Action Triggers */}
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