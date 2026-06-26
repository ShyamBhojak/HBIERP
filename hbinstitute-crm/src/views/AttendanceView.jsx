import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, Clock, Save, Search, Calendar as CalendarIcon, Filter, Ban } from 'lucide-react';

const AttendanceView = ({ students, attendanceRecords, saveAttendance, globalMonth }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFilterMode, setDateFilterMode] = useState('SingleDay'); // SingleDay, AllTime
  const [searchQuery, setSearchQuery] = useState('');
  const [localRecords, setLocalRecords] = useState({});
  const [statusFilter, setStatusFilter] = useState('All'); // All, Present, Absent, Late, Cancelled, Unmarked

  const attendanceKey = `daily_${selectedDate}`;

  // Sync with database snapshot when date shifts
  useEffect(() => {
    if (dateFilterMode === 'SingleDay') {
      const existingSheet = attendanceRecords.find(r => r.id === attendanceKey);
      if (existingSheet?.records) {
        setLocalRecords(existingSheet.records);
      } else {
        setLocalRecords({});
      }
    }
  }, [attendanceKey, attendanceRecords, dateFilterMode]);

  const handleStatusChange = (studentId, status) => {
    if (dateFilterMode === 'AllTime') {
      alert("Switch to 'Single Day' mode to modify daily attendance sheets.");
      return;
    }
    setLocalRecords(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status
    }));
  };

  const handleSave = async () => {
    if (dateFilterMode === 'AllTime') return;
    await saveAttendance(attendanceKey, {
      date: selectedDate,
      records: localRecords,
      updatedAt: new Date(),
      type: 'master_roster'
    });
    alert(`Attendance data for ${selectedDate} saved successfully!`);
  };

  // Compute aggregate percentage if historical mode is active
  const historicalStats = useMemo(() => {
    const stats = {};
    attendanceRecords.forEach(sheet => {
      if (sheet.records) {
        Object.entries(sheet.records).forEach(([studentId, status]) => {
          if (!stats[studentId]) stats[studentId] = { Present: 0, Total: 0 };
          if (status === 'Present') stats[studentId].Present += 1;
          if (status && status !== 'Cancelled') stats[studentId].Total += 1;
        });
      }
    });
    return stats;
  }, [attendanceRecords]);

  // Filter students based on textual match, calendar dates, and active parameters
  const filteredStudents = students.filter(s => {
    if (s.status !== 'Active') return false;

    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.course?.toLowerCase().includes(searchQuery.toLowerCase());

    const currentStatus = localRecords[s.id] || 'Unmarked';
    const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter;

    // // 3. New Global Common Month Context Alignment Filter
    // const matchesMonth = globalMonth === 'All' || s.month === globalMonth;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Control Panel Header layout card */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
        
        {/* Date Context Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl">
              <CalendarIcon size={22} />
            </div>
            <div>
              <select
                value={dateFilterMode}
                onChange={e => setDateFilterMode(e.target.value)}
                className="bg-transparent text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer border-none p-0 focus:ring-0"
              >
                <option value="SingleDay">Single Day View</option>
                <option value="AllTime">All-Time History</option>
              </select>
              {dateFilterMode === 'SingleDay' && (
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => setSelectedDate(e.target.value)}
                  className="block bg-transparent text-lg font-black text-gray-900 dark:text-white outline-none cursor-pointer border-none p-0 focus:ring-0"
                />
              )}
              {dateFilterMode === 'AllTime' && (
                <p className="text-xs font-bold text-gray-400 italic">Aggregating all logs</p>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search utilities */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          
          {/* Status Metric Filter Selector */}
          {dateFilterMode === 'SingleDay' && (
            <div className="relative w-full sm:w-44">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-xs font-bold appearance-none cursor-pointer outline-none"
              >
                <option value="All">All Records</option>
                <option value="Present">Present Only</option>
                <option value="Absent">Absent Only</option>
                <option value="Late">Late Only</option>
                <option value="Cancelled">Cancelled Only</option>
                <option value="Unmarked">Unmarked Only</option>
              </select>
            </div>
          )}

          {/* Search phrase string filter */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text"
              placeholder="Search name or course..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-xs font-semibold outline-none"
            />
          </div>

          {/* Action Button */}
          {dateFilterMode === 'SingleDay' && (
            <button 
              onClick={handleSave}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[10px] px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Save size={14} /> Save Roster Sheet
            </button>
          )}
        </div>
      </div>

      {/* Main Student Roster Sheet */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="p-6">Student & Course</th>
                <th className="p-6">Batch Timings</th>
                <th className="p-6 text-center">
                  {dateFilterMode === 'SingleDay' ? 'Mark Attendance' : 'All-Time Attendance Rate'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStudents.map(student => {
                const totalStats = historicalStats[student.id];
                const attendanceRate = totalStats?.Total 
                  ? ((totalStats.Present / totalStats.Total) * 100).toFixed(0) 
                  : '0';

                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-6">
                      <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">{student.name}</p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{student.course}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <Clock size={14} className="text-gray-400" />
                        {student.batchFrom && student.batchTo ? `${student.batchFrom} - ${student.batchTo}` : <span className="italic text-gray-400">Flexible</span>}
                      </div>
                    </td>
                    <td className="p-6">
                      {dateFilterMode === 'SingleDay' ? (
                        /* Standard Operations Strip */
                        <div className="flex items-center justify-center gap-2 max-w-[400px] mx-auto">
                          {[
                            { id: 'Present', icon: Check, activeClass: 'bg-green-600 text-white shadow-green-600/20', idleClass: 'bg-green-50 dark:bg-green-500/5 text-green-600' },
                            { id: 'Absent', icon: X, activeClass: 'bg-red-600 text-white shadow-red-600/20', idleClass: 'bg-red-50 dark:bg-red-500/5 text-red-600' },
                            { id: 'Late', icon: Clock, activeClass: 'bg-amber-500 text-white shadow-amber-500/20', idleClass: 'bg-amber-50 dark:bg-amber-500/5 text-amber-600' },
                            { id: 'Cancelled', icon: Ban, activeClass: 'bg-gray-700 text-white shadow-gray-700/20', idleClass: 'bg-gray-100 dark:bg-gray-800 text-gray-500' }
                          ].map(btn => {
                            const isSelected = localRecords[student.id] === btn.id;
                            return (
                              <button
                                key={btn.id}
                                onClick={() => handleStatusChange(student.id, btn.id)}
                                className={`p-3 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-transparent ${
                                  isSelected ? `${btn.activeClass} scale-105 shadow-md` : `${btn.idleClass} opacity-40 hover:opacity-100`
                                }`}
                              >
                                <btn.icon size={14} />
                                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-wider">{btn.id}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Historical Progress Layout Bar */
                        <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
                          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                Number(attendanceRate) >= 85 ? 'bg-green-500' : Number(attendanceRate) >= 70 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-black min-w-[35px] text-right">{attendanceRate}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-20 text-center text-gray-400 font-bold italic text-sm">
              No matching matching parameters found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceView;