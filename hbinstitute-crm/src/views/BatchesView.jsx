import React, { useMemo } from 'react';
import { Clock, BookOpen, Users } from 'lucide-react';

const BatchesView = ({ students }) => {
  // Dynamically group students by their actual assigned batch slots
  const batchData = useMemo(() => {
    const groups = {};
    
    students.forEach(s => {
      // Only include active students who have batch times assigned
      if (s.status === 'Active' && s.batchFrom && s.batchTo) {
        const slot = `${s.batchFrom} - ${s.batchTo}`;
        if (!groups[slot]) {
          groups[slot] = [];
        }
        groups[slot].push(s);
      }
    });
    
    return groups;
  }, [students]);

  // Sort batches by their start time
  const sortedBatchSlots = Object.keys(batchData).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-widest">Active Batches Roster</h2>
        <span className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1 rounded-full uppercase">
          {Object.keys(batchData).length} Active Batches
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedBatchSlots.map((slot) => (
          <div key={slot} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">{slot}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  {batchData[slot].length} {batchData[slot].length === 1 ? 'Student' : 'Students'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {batchData[slot].map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[10px] font-black text-indigo-600">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{s.name}</span>
                  </div>
                  <BookOpen size={14} className="text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        ))}
        {sortedBatchSlots.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem]">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 font-bold">No active batches assigned to students.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchesView;