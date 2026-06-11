import React, { useState, useMemo, useEffect } from 'react';
import { Search, IndianRupee, Receipt, Landmark, ArrowUpRight, Calendar as CalendarIcon, Filter, History, Download } from 'lucide-react';

const FeesView = ({ students, feesRecords, saveFeePayment, globalMonth }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [feesMonthFilterMode, setFeesMonthFilterMode] = useState('CurrentMonth'); 

  const formatToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const availableMonths = useMemo(() => {
    const months = students
      .map(s => s.month)
      .filter(Boolean);
    return [...new Set(months)].sort((a, b) => new Date(b) - new Date(a));
  }, [students]);

  useEffect(() => {
    if (selectedStudentId) {
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      if (selectedStudent?.joiningDate?.seconds) {
        const enrollmentDateStr = new Date(selectedStudent.joiningDate.seconds * 1000)
          .toISOString()
          .split('T')[0];
        setPaymentDate(enrollmentDateStr);
      } else {
        setPaymentDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedStudentId, students]);

  const studentPayments = useMemo(() => {
    const summary = {};
    feesRecords.forEach(tx => {
      if (tx.studentId && tx.amount) {
        summary[tx.studentId] = (summary[tx.studentId] || 0) + Number(tx.amount);
      }
    });
    return summary;
  }, [feesRecords]);

  const effectiveMonth = useMemo(() => {
    if (feesMonthFilterMode === 'CurrentMonth') return globalMonth;
    if (feesMonthFilterMode === 'AllTime') return 'All';
    return feesMonthFilterMode;
  }, [feesMonthFilterMode, globalMonth]);

  const financeStats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;

    students.forEach(s => {
      if (s.status === 'Active' || s.status === 'Completed') {
        const matchesMonth = effectiveMonth === 'All' || s.month === effectiveMonth;
        if (!matchesMonth) return;

        const courseFee = Number(s.totalFee) || 15000; 
        totalExpected += courseFee;
        totalCollected += (studentPayments[s.id] || 0);
      }
    });

    return {
      expected: totalExpected,
      collected: totalCollected,
      pending: totalExpected - totalCollected
    };
  }, [students, studentPayments, effectiveMonth]);

  const ledgerData = useMemo(() => {
    return students
      .filter(s => s.status === 'Active' || s.status === 'Completed')
      .filter(student => {
        if (effectiveMonth === 'All') return true;
        const studentTransactions = feesRecords.filter(tx => tx.studentId === student.id);
        return studentTransactions.some(tx => {
          if (!tx.date) return false;
          const txDateObj = new Date(tx.date);
          const txMonthStr = txDateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
          return txMonthStr === effectiveMonth;
        });
      })
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.course?.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(student => {
        const totalFee = Number(student.totalFee) || 15000;
        const paid = studentPayments[student.id] || 0;
        
        const history = feesRecords
          .filter(tx => tx.studentId === student.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
          ...student,
          totalFee,
          paid,
          balance: totalFee - paid,
          paymentHistory: history
        };
      });
  }, [students, studentPayments, feesRecords, searchQuery, effectiveMonth]);

  // =========================================================================
  // HIGH-FIDELITY VECTOR PDF PRINT ENGINE GENERATOR (window.print iframe sandbox)
  // =========================================================================
  const downloadReceiptPDF = (student, tx) => {
    // 1. Construct a clean HTML structures designed with vector spacing styling instructions
    const htmlInvoiceContent = `
      <html>
        <head>
          <title>Receipt_${student.name.replace(/\s+/g, '_')}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            * { box-sizing: border-box; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
            body { background: #ffffff; color: #1e293b; padding: 50px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt-frame { border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; max-width: 700px; margin: 0 auto; relative; }
            .header-strip { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #e2e8f0; padding-bottom: 30px; margin-bottom: 30px; }
            .brand-title { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; color: #4f46e5; text-transform: uppercase; }
            .brand-subtitle { font-size: 11px; font-weight: 700; color: #64748b; tracking: 0.1em; text-transform: uppercase; margin-top: 2px; }
            .invoice-label { font-size: 24px; font-weight: 900; tracking: -0.02em; text-transform: uppercase; text-align: right; color: #0f172a; }
            .meta-grid { display: grid; grid-cols: 2; gap: 20px; display: flex; justify-content: space-between; margin-bottom: 40px; }
            .meta-block p { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .meta-block h4 { font-size: 15px; color: #0f172a; font-weight: 800; text-transform: uppercase; }
            .table-box { width: 100%; border-collapse: collapse; margin-bottom: 30px; text-align: left; }
            .table-box th { background: #f8fafc; padding: 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; tracking: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            .table-box td { padding: 20px 16px; font-size: 14px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
            .table-box td.price-col { font-weight: 800; color: #0f172a; }
            .summary-box { background: #f8fafc; border-radius: 18px; padding: 24px; margin-left: auto; width: 320px; space-y: 3px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #64748b; padding: 6px 0; }
            .summary-row.total-row { border-t: 1px solid #e2e8f0; padding-top: 12px; margin-top: 8px; font-size: 16px; font-weight: 900; color: #4f46e5; }
            .footer-msg { text-align: center; margin-top: 50px; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
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
                <h2 class="invoice-label">Receipt</h2>
                <p style="font-size:12px; font-weight:700; color:#64748b; text-align:right; margin-top:4px;">NO: ${tx.id || 'N/A'}</p>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-block">
                <p>Issued To</p>
                <h4>${student.name}</h4>
                <span style="font-size:11px; font-weight:600; color:#94a3b8;">ID: ${student.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div class="meta-block" style="text-align: right;">
                <p>Date of Payment</p>
                <h4>${formatToDDMMYYYY(tx.date)}</h4>
                <span style="font-size:11px; font-weight:600; color:#94a3b8;">Method: ${tx.mode || 'Cash'}</span>
              </div>
            </div>

            <table class="table-box">
              <thead>
                <tr>
                  <th>Course Description</th>
                  <th style="text-align: right;">Amount Logged</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <p style="font-weight:800; color:#0f172a;">${student.course}</p>
                    <span style="font-size:11px; color:#94a3b8; font-weight:600;">${tx.remarks || 'Installment Payment'}</span>
                  </td>
                  <td class="price-col" style="text-align: right;">₹${Number(tx.amount).toLocaleString('en-IN')}.00</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-box">
              <div class="summary-row"><span>Total Expected Fee</span><span>₹${student.totalFee.toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row"><span>Total Amount Paid</span><span style="color:#16a34a; font-weight:700;">₹${student.paid.toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row total-row"><span>Remaining Balance</span><span>₹${student.balance.toLocaleString('en-IN')}.00</span></div>
            </div>

            <div class="footer-msg">Thank you for learning with us!</div>
          </div>
          <script>
            // Execute window context generation hook directly on load triggers
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    // 2. Build a sandboxed operational target frame container overlay to avoid main tab context flashing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    
    document.body.appendChild(printFrame);

    // 3. Inject content structures and prompt the local OS vector conversion pipeline sheet
    const docRef = printFrame.contentWindow.document;
    docRef.open();
    docRef.write(htmlInvoiceContent);
    docRef.close();

    // 4. Garbage clean-up frames vectors smoothly after print manager handshakes complete
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !paymentAmount || Number(paymentAmount) <= 0) {
      alert("Please select a student and provide a valid installment amount.");
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    const txId = `tx_${Date.now()}`;

    await saveFeePayment(txId, {
      id: txId,
      studentId: selectedStudentId,
      studentName: student?.name || 'Unknown',
      course: student?.course || 'N/A',
      amount: Number(paymentAmount),
      mode: paymentMode,
      remarks: paymentRemarks,
      date: paymentDate,
      createdAt: new Date()
    });

    alert(`Installment of ₹${paymentAmount} logged successfully for date ${formatToDDMMYYYY(paymentDate)}!`);
    setPaymentAmount('');
    setPaymentRemarks('');
    setSelectedStudentId('');
  };

  const toggleRowExpansion = (studentId) => {
    setExpandedStudentId(prev => (prev === studentId ? null : studentId));
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Expected Revenue (Selected Scope)', value: financeStats.expected, icon: Landmark, color: 'text-blue-500', bg: 'bg-blue-500/5' },
          { label: 'Fees Collected', value: financeStats.collected, icon: IndianRupee, color: 'text-green-500', bg: 'bg-green-500/5' },
          { label: 'Outstanding Balance', value: financeStats.pending, icon: Receipt, color: 'text-red-500', bg: 'bg-red-500/5' }
        ].map((card, i) => (
          <div key={i} className="p-6 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between h-36">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
              <card.icon className={card.color} size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-0.5">{card.label}</p>
              <h3 className="text-2xl font-black">₹{card.value.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Utilities Control Panel Strip Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl shrink-0">
            <Filter size={20} />
          </div>
          <div className="flex flex-col flex-1 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Fees Roster Scope</label>
            <select
              value={feesMonthFilterMode}
              onChange={e => setFeesMonthFilterMode(e.target.value)}
              className="bg-transparent text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer border-none p-0 focus:ring-0"
            >
              <option value="CurrentMonth">Active Month: {globalMonth}</option>
              <option value="AllTime">All-Time History Ledger</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>Historical: {m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full xl:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search ledger by student or course..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-xs font-semibold outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Master Ledger Table Container */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[400px]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-950 text-gray-400 uppercase tracking-wider text-[10px] font-black border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="p-6">Student & Course</th>
                  <th className="p-6">Total Fee</th>
                  <th className="p-6">Paid</th>
                  <th className="p-6">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {ledgerData.map(student => {
                  const isExpanded = expandedStudentId === student.id;
                  return (
                    <React.Fragment key={student.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-all cursor-pointer ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-500/5' : ''}`} 
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          toggleRowExpansion(student.id);
                        }}
                      >
                        <td className="p-6">
                          <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">{student.name}</p>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{student.course}</p>
                        </td>
                        <td className="p-6 font-bold text-gray-700 dark:text-gray-300">₹{student.totalFee.toLocaleString('en-IN')}</td>
                        <td className="p-6 font-bold text-green-600">₹{student.paid.toLocaleString('en-IN')}</td>
                        <td className="p-6">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${student.balance <= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            ₹{student.balance.toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Section displaying individual payment receipts layout with PDF option */}
                      {isExpanded && (
                        <tr className="bg-gray-50/40 dark:bg-gray-950/30">
                          <td colSpan="4" className="p-6 border-t border-b border-gray-100 dark:border-gray-800/80">
                            <div className="space-y-3 max-w-xl">
                              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                                <History size={12} className="text-indigo-500" /> Transaction Payment History Dates
                              </p>
                              
                              {student.paymentHistory.map((tx, index) => (
                                <div key={tx.id || index} className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/60 rounded-xl p-4 text-xs">
                                  <div>
                                    <p className="font-black text-gray-800 dark:text-gray-200">
                                      Installment Collected: <span className="text-green-600">₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
                                      Mode: {tx.mode || 'Cash'} {tx.remarks ? `| ${tx.remarks}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black bg-gray-50 dark:bg-gray-950 px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                                      {formatToDDMMYYYY(tx.date)}
                                    </span>
                                    {/* Download PDF Action Button Trigger */}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation(); // Avoid folding row on selection
                                        downloadReceiptPDF(student, tx);
                                      }}
                                      className="p-2 bg-gray-100 hover:bg-indigo-600 text-gray-500 hover:text-white rounded-lg transition-all"
                                      title="Download PDF Invoice Receipt"
                                    >
                                      <Download size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {student.paymentHistory.length === 0 && (
                                <p className="text-xs text-gray-400 italic pl-1">No separate installment history logged yet.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {ledgerData.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-20 font-bold text-gray-400 italic">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collect Fee Action Form Card */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 h-fit space-y-4">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <ArrowUpRight size={18} className="text-indigo-500" /> Collect Installment
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Post transaction receipt entry</p>
          </div>

          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-bold outline-none cursor-pointer"
                required
              >
                <option value="">Choose Student Account</option>
                {students.filter(s => s.status === 'Active' || s.status === 'Completed').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.course})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Collection Date</label>
              <div className="relative w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center justify-between cursor-pointer">
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {formatToDDMMYYYY(paymentDate)}
                </span>
                <CalendarIcon size={14} className="text-gray-400" />
                <input 
                  type="date" 
                  value={paymentDate} 
                  onChange={e => setPaymentDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Amount Received (₹)</label>
              <input
                type="number"
                placeholder="Amount in INR"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-bold outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Payment Method Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {['Cash', 'UPI', 'Net Banking', 'Cheque'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-500'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Remarks / Receipt No.</label>
              <input
                type="text"
                placeholder="Installment 1, Receipt Ref, etc."
                value={paymentRemarks}
                onChange={e => setPaymentRemarks(e.target.value)}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-medium outline-none"
              />
            </div>

            <button type="submit" className="w-full bg-indigo-600 py-3.5 rounded-xl font-black uppercase tracking-widest text-white text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
              Log Payment Receipt
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeesView;