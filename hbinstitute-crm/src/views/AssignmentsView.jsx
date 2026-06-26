import React, { useState, useMemo } from 'react';
import { Search, FileText, Calendar, BookOpen, Trash2, CheckCircle, Clock } from 'lucide-react';
// import { formatLongDate } from '../utils/helpers';

const AssignmentsView = ({ assignments, students, deleteAssignment, setIsAddingAssignment, updateSubmissionStatus }) => {
  const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('All');

  // Compute live analytical overview counts
  const metrics = useMemo(() => {
    let totalSubmissions = 0;
    let completedCount = 0;

    assignments.forEach(a => {
      if (a.submissions) {
        Object.values(a.submissions).forEach(status => {
          totalSubmissions++;
          if (status === 'Completed') completedCount++;
        });
      }
    });

    return {
      total: assignments.length,
      rate: totalSubmissions ? Math.round((completedCount / totalSubmissions) * 100) : 0
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            a.course?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [assignments, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl"><FileText size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Active Tasks</p>
            <h3 className="text-2xl font-black">{metrics.total} Assignments</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl"><CheckCircle size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Completion Rate</p>
            <h3 className="text-2xl font-black text-emerald-500">{metrics.rate}% Checked</h3>
          </div>
        </div>
      </div>

      {/* Control Search Row */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input 
            type="text" 
            placeholder="Search by assignment title or targeted course..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-semibold outline-none" 
          />
        </div>
        <button 
          onClick={() => setIsAddingAssignment(true)}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 px-6 rounded-xl uppercase tracking-wider whitespace-nowrap"
        >
          Create Assignment
        </button>
      </div>

      {/* Assignments Render Grid Stack */}
      <div className="space-y-4">
        {filteredAssignments.map((task) => {
          // Track assigned students belonging to this specific course module
          const courseStudents = students.filter(s => s.status === 'Active' && s.course === task.course);

          return (
            <div key={task.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6 justify-between">
                
                {/* Information Layout Block */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-black text-lg uppercase tracking-tight text-gray-900 dark:text-white">{task.title}</h4>
                    <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {task.course}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{task.description}</p>
                  
                  <div className="flex gap-4 text-[11px] text-gray-400 font-bold pt-2">
                    <span className="flex items-center gap-1.5"><Calendar size={13}/> Deadline: {task.dueDate}</span>
                    <span className="flex items-center gap-1.5"><BookOpen size={13}/> Assigned: {courseStudents.length} Students</span>
                  </div>
                </div>

                {/* Individual Actions Trigger */}
                <div className="flex lg:flex-col items-end gap-2 shrink-0">
                  <button 
                    onClick={() => deleteAssignment(task.id)} 
                    className="p-2.5 bg-gray-50 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                    title="Remove Assignment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Submissions Roster Tracking Checklist Panel Grid */}
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Student Submission Ledger</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {courseStudents.map(std => {
                    const submissionStatus = (task.submissions && task.submissions[std.id]) || 'Pending';
                    
                    return (
                      <div key={std.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-100 dark:border-gray-800/60">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{std.name}</span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-wide">ID: {std.id.slice(0,6).toUpperCase()}</span>
                        </div>
                        
                        <button
                          onClick={() => {
                            const nextStatus = submissionStatus === 'Pending' ? 'Completed' : 'Pending';
                            updateSubmissionStatus(task.id, std.id, nextStatus);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            submissionStatus === 'Completed'
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {submissionStatus === 'Completed' ? <CheckCircle size={10}/> : <Clock size={10}/>}
                          {submissionStatus}
                        </button>
                      </div>
                    );
                  })}
                  {courseStudents.length === 0 && (
                    <p className="text-[11px] text-gray-400 italic font-medium py-1">No active students enrolled in this course stream.</p>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssignmentsView;