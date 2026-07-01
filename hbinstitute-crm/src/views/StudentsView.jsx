import React, { useMemo } from 'react';
import { Search, Filter, Clock, Edit3, Trash2, CheckSquare, DollarSign, Download, Award } from 'lucide-react';
import { STUDENT_STATUS } from '../constants/options';
import { formatLongDate } from '../utils/helpers';
// import InstituteLogo from '../assets/2231B0A7-6B93-4CCF-AAC6-14A13C40CF2F.JPG.jpeg';
// import signatory from '../assets/signatory.PNG';
import { generateCertificate } from '../utils/pdfGenerator';
import { downloadStatementReceipt } from '../utils/statementPrinter';


const StudentsView = ({ studentSearch, setStudentSearch, globalMonth, setGlobalMonth, studentMonthOptions, studentViewMode, setStudentViewMode, selectedStatus, setSelectedStatus, filteredStudents, studentsTimelineEvents, editStudent, deleteStudent, students, leads, attendanceRecords = [], feesRecords = [] }) => {

  // Centralized Chronological Sorting Filter (Newest Enrolments First)
  const sortedFilteredStudents = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) return [];
    return [...filteredStudents].sort((a, b) => {
      const timestampA = a.joiningDate?.seconds || 0;
      const timestampB = b.joiningDate?.seconds || 0;
      return timestampB - timestampA; // Descending order (newest timestamp wins)
    });
  }, [filteredStudents]);

  const studentAttendanceMetrics = useMemo(() => {
    const metrics = {};
    attendanceRecords.forEach(sheet => {
      if (sheet.records) {
        Object.entries(sheet.records).forEach(([studentId, status]) => {
          if (!metrics[studentId]) metrics[studentId] = { present: 0, total: 0 };
          if (status === 'Present') metrics[studentId].present += 1;
          if (status && status !== 'Cancelled') metrics[studentId].total += 1;
        });
      }
    });
    return metrics;
  }, [attendanceRecords]);

  const studentFinancialMetrics = useMemo(() => {
    const metrics = {};
    feesRecords.forEach(tx => {
      if (tx.studentId && tx.amount) {
        metrics[tx.studentId] = (metrics[tx.studentId] || 0) + Number(tx.amount);
      }
    });
    return metrics;
  }, [feesRecords]);

  const getStudentTimeline = (student) => {
    const events = [];
    if (student.leadId && leads) {
      const originalLead = leads.find(l => l.id === student.leadId);
      const inquiryDate = originalLead?.rawDate || (student.createdAt?.toDate ? student.createdAt.toDate() : null);
      if (inquiryDate) events.push({ label: 'Inquiry Generated', dateStr: formatLongDate(inquiryDate), color: 'bg-orange-500', timestamp: new Date(inquiryDate).getTime() });
    }
    if (student.joiningDate?.seconds) events.push({ label: 'Enrolled / Joined', dateStr: formatLongDate(student.joiningDate.seconds * 1000), color: 'bg-green-500', timestamp: student.joiningDate.seconds * 1000 });
    if (student.statusHistory) {
      Object.entries(student.statusHistory).forEach(([status, dateStr]) => {
        if (status === 'Active' || status === 'Enrolled') return;
        let color = status === 'Completed' ? 'bg-blue-500' : status === 'Dropped' ? 'bg-red-500' : status === 'Placed' ? 'bg-purple-500' : 'bg-gray-500';
        let parsedTimestamp = Date.now();
        if (dateStr) {
          let cleanStr = dateStr.replace(/\s+/g, ' ').replace(/,+/g, '').replace(/-/g, ' ');
          let parsed = new Date(cleanStr.split(' at ')[0]);
          if (!isNaN(parsed.getTime())) parsedTimestamp = parsed.getTime();
        }
        events.push({ label: `Status: ${status}`, dateStr: dateStr.includes(',') ? dateStr : formatLongDate(parsedTimestamp), color, timestamp: parsedTimestamp });
      });
    }
    return events.sort((a, b) => a.timestamp - b.timestamp);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-indigo-600 transition-all outline-none" placeholder="Search by name or phone or course..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <select className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-10 py-4 text-xs font-bold appearance-none cursor-pointer outline-none focus:border-indigo-500" value={globalMonth} onChange={e => setGlobalMonth(e.target.value)}>
                {studentMonthOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={() => setStudentViewMode('grid')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${studentViewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Card Grid</button>
          <button onClick={() => setStudentViewMode('timeline')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${studentViewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Clock size={14} /> Status Timeline Feed</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 self-center mr-2">Filter Status:</span>
        <button onClick={() => setSelectedStatus('')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedStatus === '' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'}`}>All</button>
        {STUDENT_STATUS.map(status => <button key={status} onClick={() => setSelectedStatus(status)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedStatus === status ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'}`}>{status}</button>)}
      </div>

      {studentViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 my-6">
          {sortedFilteredStudents.map((student) => {
            const attendance = studentAttendanceMetrics[student.id];
            const attendanceRatio = attendance?.total ? Math.round((attendance.present / attendance.total) * 100) : 0;
            const textRatio = attendance?.total ? `${attendance.present}/${attendance.total} Days` : 'No sessions marked';
            const totalCourseFee = Number(student.totalFee) || 0;
            const allowedDiscount = Number(student.discount) || 0; 
            const paidInstallments = studentFinancialMetrics[student.id] || 0;
            const netExpectedFee = totalCourseFee - allowedDiscount;
            const isFullyPaid = student.feesStatus === 'Paid' || (netExpectedFee > 0 && (netExpectedFee - paidInstallments) <= 0);
            const outstandingBalance = isFullyPaid ? 0 : (netExpectedFee - paidInstallments);

            return (
              <div key={student.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h3>
                      <p className="text-sm text-gray-500">ID: {student.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${student.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : student.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : student.status === 'Dropped' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>{student.status || 'Active'}</span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${outstandingBalance <= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{outstandingBalance <= 0 ? 'Paid' : `Due: ₹${outstandingBalance.toLocaleString('en-IN')}`}</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Mobile</p><p className="font-semibold text-sm">{student.mobile || "N/A"}</p></div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Enrolled Courses</p>
                        <div className="flex flex-wrap gap-1">
                          {(student.courses || []).map((course, idx) => {
                            const courseName = typeof course === 'object' ? course.name : course;
                            return (
                              <span key={idx} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md font-bold text-xs border border-indigo-200/40 dark:border-indigo-500/10 uppercase tracking-wide">
                                {courseName}
                              </span>
                            );
                          })}
                          {!student.courses && (
                            <span className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                              {typeof student.course === 'object' ? student.course.name : (student.course || "N/A")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Google Email Account</p>
                      <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 break-all mt-0.5">{student.email || "No email assigned"}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Batch Timing</p>
                      <p className="font-semibold text-sm">{student.batchFrom && student.batchTo ? `${student.batchFrom} - ${student.batchTo}` : 'Not Assigned'}</p>
                    </div>
                    <div className="pt-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1.5">Assigned Mentors / Faculty</p>
                      <div className="flex flex-wrap gap-1.5">
                        {student.assignedFacultyNames && student.assignedFacultyNames.length > 0 ? (
                          student.assignedFacultyNames.map((facName, index) => (
                            <span key={index} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[10px] uppercase tracking-wide border border-indigo-200/40 dark:border-indigo-500/10">
                              👨‍ {facName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No faculty assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 p-3.5 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1"><CheckSquare size={12} className="text-indigo-500" /> Attendance</span>
                        <div>
                          <p className={`text-sm font-black ${attendanceRatio >= 85 ? 'text-green-500' : attendanceRatio >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{attendanceRatio}%</p>
                          <p className="text-[9px] text-gray-400 font-bold">{textRatio}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 p-3.5 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1"><DollarSign size={12} className="text-emerald-500" /> Fees Status</span>

                        <div>
                          <p className={`text-sm font-black ${outstandingBalance <= 0 ? 'text-green-500' : 'text-gray-800 dark:text-gray-200'}`}>
                            ₹{paidInstallments.toLocaleString('en-IN')} <span className="text-[10px] text-gray-400 font-normal">Paid</span>
                          </p>
                          <div className="text-[9px] text-gray-400 font-bold space-y-0.5 mt-0.5">
                            <p>Total course: ₹{totalCourseFee.toLocaleString('en-IN')}</p>
                            {allowedDiscount > 0 && (
                              <p className="text-emerald-600 dark:text-emerald-400 font-extrabold">Discount: -₹{allowedDiscount.toLocaleString('en-IN')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><Clock size={12} className="text-indigo-500" /> Journey Milestones</p>
                      <div className="relative border-l border-gray-200 dark:border-gray-800 ml-1.5 pl-4 space-y-3">
                        {getStudentTimeline(student).map((event, idx) => (
                          <div key={idx} className="relative text-[11px]">
                            <span className={`absolute -left-[20.5px] top-1 flex h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-900 ${event.color}`} />
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-gray-700 dark:text-gray-300">{event.label}</span>
                              <span className="text-[9px] text-gray-400 font-medium">{event.dateStr}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50/30 dark:bg-gray-950/20 flex justify-between items-center">
                  <div className="flex gap-1">
                    <button onClick={() => editStudent(student)} className="p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" title="Edit Student Profile"><Edit3 size={16} /></button>
                    <button onClick={() => deleteStudent(student.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove Record"><Trash2 size={16} /></button>
                    <button
                      onClick={() => {
                        const studentFees = feesRecords.filter(f => f.studentId === student.id);
                        const paid = studentFees.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
                        const totalFee = Number(student.totalFee) || 0;
                        const discount = Number(student.discount) || 0;
                        const balance = Math.max(0, (totalFee - discount) - paid);
                        const computedMetrics = { paid, balance };
                        downloadStatementReceipt(student, studentFees, computedMetrics);
                      }}
                      className="p-2 text-gray-400 hover:text-emerald-500 transition-colors" title="Print Ledger Statement PDF"><Download size={16} /></button>
                    {student.status === 'Completed' && (
                      <button
                        onClick={() => generateCertificate(student)}
                        className="p-2 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
                        title="Download Completion Certificate"
                      >
                        <Award size={16} />
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase">H.B.INSTITUTE -ERP</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 my-6">
          <div className="flex items-center gap-3 mb-6"><Clock className="text-indigo-600 dark:text-indigo-400" size={24} /><div><h3 className="text-lg font-bold">ERP Student Activities Log</h3><p className="text-xs text-gray-500">Visual chronological stream of enrollment and milestone changes</p></div></div>
          <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-4 pl-6 space-y-8 pb-4">
            {studentsTimelineEvents.map((event) => (
              <div key={event.id} className="relative group">
                <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-gray-50 dark:ring-gray-900 ${event.color}`} />
                <div className="bg-white dark:bg-gray-950 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap"><span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">{event.studentName}</span><span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md font-semibold">{event.course}</span></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Action: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{event.type}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-xl">{event.dateStr}</span>
                      <button onClick={() => { const std = students.find(s => s.id === event.studentId); if (std) editStudent(std); }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-indigo-500 transition-opacity"><Edit3 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsView;