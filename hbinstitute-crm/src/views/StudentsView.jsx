import React, { useMemo } from 'react';
import { Search, Filter, Clock, Edit3, Trash2, CheckSquare, DollarSign, Download } from 'lucide-react';
import { STUDENT_STATUS } from '../constants/options';
import { formatLongDate } from '../utils/helpers';

const StudentsView = ({ studentSearch, setStudentSearch, globalMonth, setGlobalMonth, studentMonthOptions, studentViewMode, setStudentViewMode, selectedStatus, setSelectedStatus, filteredStudents, studentsTimelineEvents, editStudent, deleteStudent, students, leads, attendanceRecords = [], feesRecords = [] }) => {

  // 1. Process attendance records array to compute percentages cleanly
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

  // 2. Process fees records array independently to compute accurate paid values
  const studentFinancialMetrics = useMemo(() => {
    const metrics = {};
    feesRecords.forEach(tx => {
      if (tx.studentId && tx.amount) {
        metrics[tx.studentId] = (metrics[tx.studentId] || 0) + Number(tx.amount);
      }
    });
    return metrics;
  }, [feesRecords]);

  // 3. Helper function to compile individual student milestones for the inside-card journey stream
  const getStudentTimeline = (student) => {
    const events = [];

    if (student.leadId && leads) {
      const originalLead = leads.find(l => l.id === student.leadId);
      const inquiryDate = originalLead?.rawDate || (student.createdAt?.toDate ? student.createdAt.toDate() : null);
      if (inquiryDate) {
        events.push({
          label: 'Inquiry Generated',
          dateStr: formatLongDate(inquiryDate),
          color: 'bg-orange-500',
          timestamp: new Date(inquiryDate).getTime()
        });
      }
    }

    if (student.joiningDate?.seconds) {
      events.push({
        label: 'Enrolled / Joined',
        dateStr: formatLongDate(student.joiningDate.seconds * 1000),
        color: 'bg-green-500',
        timestamp: student.joiningDate.seconds * 1000
      });
    }

    if (student.statusHistory) {
      Object.entries(student.statusHistory).forEach(([status, dateStr]) => {
        if (status === 'Active' || status === 'Enrolled') return;

        let color = status === 'Completed' ? 'bg-blue-500' :
                    status === 'Dropped' ? 'bg-red-500' :
                    status === 'Placed' ? 'bg-purple-500' : 'bg-gray-500';

        let parsedTimestamp = Date.now();
        if (dateStr) {
          let cleanStr = dateStr.replace(/\s+/g, ' ').replace(/,+/g, '').replace(/-/g, ' ');
          let parsed = new Date(cleanStr.split(' at ')[0]);
          if (!isNaN(parsed.getTime())) parsedTimestamp = parsed.getTime();
        }

        events.push({
          label: `Status: ${status}`,
          dateStr: dateStr.includes(',') ? dateStr : formatLongDate(parsedTimestamp),
          color: color,
          timestamp: parsedTimestamp
        });
      });
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  };

  // High-Fidelity PDF Vector Print Engine Statement Compiler
  const downloadStudentStatementPDF = (student, totalFee, paid, balance) => {
    const studentHistory = feesRecords
      .filter(tx => tx.studentId === student.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const htmlInvoiceContent = `
      <html>
        <head>
          <title>Statement_${student.name.replace(/\s+/g, '_')}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            * { box-sizing: border-box; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
            body { background: #ffffff; color: #1e293b; padding: 50px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt-frame { border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; max-width: 700px; margin: 0 auto; }
            .header-strip { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #e2e8f0; padding-bottom: 30px; margin-bottom: 30px; }
            .brand-title { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; color: #4f46e5; text-transform: uppercase; }
            .brand-subtitle { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px; }
            .invoice-label { font-size: 20px; font-weight: 900; text-transform: uppercase; text-align: right; color: #0f172a; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .meta-block p { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .meta-block h4 { font-size: 15px; color: #0f172a; font-weight: 800; text-transform: uppercase; }
            .table-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; }
            .table-box th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            .table-box td { padding: 16px; font-size: 13px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
            .summary-box { background: #f8fafc; border-radius: 18px; padding: 24px; margin-left: auto; width: 320px; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #64748b; padding: 6px 0; }
            .summary-row.total-row { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 8px; font-size: 16px; font-weight: 900; color: #4f46e5; }
            .footer-msg { text-align: center; margin-top: 40px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="receipt-frame">
            <div class="header-strip">
              <div>
                <h1 class="brand-title">H.B.INSTITUTE</h1>
                <p class="brand-subtitle">The Training Center</p>
              </div>
              <div>
                <h2 class="invoice-label">Fees Ledger Statement</h2>
                <p style="font-size:12px; font-weight:700; color:#64748b; text-align:right; margin-top:4px;">As of: ${new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-block">
                <p>Student Name</p>
                <h4>${student.name}</h4>
                <span style="font-size:11px; font-weight:600; color:#94a3b8;">Course: ${student.course}</span>
              </div>
              <div class="meta-block" style="text-align: right;">
                <p>Account Metadata</p>
                <h4>ID: ${student.id.slice(0, 8).toUpperCase()}</h4>
                <span style="font-size:11px; font-weight:600; color:#94a3b8;">Mobile: ${student.mobile || 'N/A'}</span>
              </div>
            </div>

            <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; tracking: 0.05em; margin-bottom: 10px;">Itemized Installment Transactions</p>
            <table class="table-box">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Remarks/Ref</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${studentHistory.map(tx => `
                  <tr>
                    <td>${tx.date ? tx.date.split('-').reverse().join('/') : 'N/A'}</td>
                    <td>${tx.mode || 'Cash'}</td>
                    <td style="color:#64748b; font-size:12px;">${tx.remarks || 'Installment Entry'}</td>
                    <td style="text-align: right; font-weight: 800;">₹${Number(tx.amount).toLocaleString('en-IN')}.00</td>
                  </tr>
                `).join('')}
                ${studentHistory.length === 0 ? `<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic; padding:20px;">No individual transactions logged yet.</td></tr>` : ''}
              </tbody>
            </table>

            <div class="summary-box">
              <div class="summary-row"><span>Total Course Cost</span><span>₹${totalFee.toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row"><span>Total Paid Collections</span><span style="color:#16a34a; font-weight:700;">₹${paid.toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row total-row"><span>Outstanding Dues</span><span>₹${balance.toLocaleString('en-IN')}.00</span></div>
            </div>

            <div class="footer-msg">Thank you for learning with us!</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    
    document.body.appendChild(printFrame);
    const docRef = printFrame.contentWindow.document;
    docRef.open();
    docRef.write(htmlInvoiceContent);
    docRef.close();

    setTimeout(() => { document.body.removeChild(printFrame); }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Control Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
              placeholder="Search by name or phone or course..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <select
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-10 py-4 text-xs font-bold appearance-none cursor-pointer outline-none focus:border-indigo-500"
                value={globalMonth}
                onChange={e => setGlobalMonth(e.target.value)}
              >
                {studentMonthOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 w-full md:w-auto mt-2 md:mt-0">
          <button
            onClick={() => setStudentViewMode('grid')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${studentViewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Card Grid
          </button>
          <button
            onClick={() => setStudentViewMode('timeline')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${studentViewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Clock size={14} /> Status Timeline Feed
          </button>
        </div>
      </div>

      {/* Roster Layout Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 self-center mr-2">Filter Status:</span>
        <button
          onClick={() => setSelectedStatus('')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedStatus === '' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'}`}
        >
          All
        </button>
        {STUDENT_STATUS.map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedStatus === status ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Main Container Workspace */}
      {studentViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 my-6">
          {filteredStudents.map((student) => {
            const attendance = studentAttendanceMetrics[student.id];
            const attendanceRatio = attendance?.total ? Math.round((attendance.present / attendance.total) * 100) : 0;
            const textRatio = attendance?.total ? `${attendance.present}/${attendance.total} Days` : 'No sessions marked';

            const totalCourseFee = Number(student.totalFee) || 0;
            const paidInstallments = studentFinancialMetrics[student.id] || 0;

            const isFullyPaid = student.feesStatus === 'Paid' || (totalCourseFee > 0 && (totalCourseFee - paidInstallments) <= 0);
            const outstandingBalance = isFullyPaid ? 0 : (totalCourseFee - paidInstallments);

            return (
              <div key={student.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h3>
                      <p className="text-sm text-gray-500">ID: {student.id.slice(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${student.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                          student.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                            student.status === 'Dropped' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>{student.status || 'Active'}</span>

                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${outstandingBalance <= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {outstandingBalance <= 0 ? 'Paid' : `Due: ₹${outstandingBalance.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Mobile</p><p className="font-semibold text-sm">{student.mobile || "N/A"}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Course</p><p className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">{student.course || "N/A"}</p></div>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Batch Timing</p>
                      <p className="font-semibold text-sm">
                        {student.batchFrom && student.batchTo ? `${student.batchFrom} - ${student.batchTo}` : 'Not Assigned'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 p-3.5 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <CheckSquare size={12} className="text-indigo-500" /> Attendance
                        </span>
                        <div>
                          <p className={`text-sm font-black ${attendanceRatio >= 85 ? 'text-green-500' : attendanceRatio >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                            {attendanceRatio}%
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold">{textRatio}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 p-3.5 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <DollarSign size={12} className="text-emerald-500" /> Fees Status
                        </span>
                        <div>
                          <p className={`text-sm font-black ${outstandingBalance <= 0 ? 'text-green-500' : 'text-gray-800 dark:text-gray-200'}`}>
                            {outstandingBalance <= 0 ? `₹${totalCourseFee.toLocaleString('en-IN')}` : `₹${paidInstallments.toLocaleString('en-IN')}`} 
                            <span className="text-[10px] text-gray-400 font-normal"> Paid</span>
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold">Total: ₹{totalCourseFee.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>

                    {/* RESTORED: Student Journey Timeline block inside the card footprint */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                        <Clock size={12} className="text-indigo-500" /> Journey Milestones
                      </p>
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
                    <button onClick={() => downloadStudentStatementPDF(student, totalCourseFee, paidInstallments, outstandingBalance)} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors" title="Print Ledger Statement PDF"><Download size={16} /></button>
                  </div>
                  <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase">H.B. Institute ERP</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Master Status Feed Tab Log View */
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
            {studentsTimelineEvents.length === 0 && (
              <div className="text-center py-12 ml-[-24px]"><Clock className="mx-auto text-gray-400 mb-2" size={32} /><p className="text-sm text-gray-500">No student status records found matching filters.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsView;