import React, { useState, useMemo, useEffect } from 'react';
import { Search, IndianRupee, Receipt, Landmark, ArrowUpRight, Calendar as CalendarIcon, Filter, History, Download } from 'lucide-react';
import { downloadStatementReceipt } from '../utils/statementPrinter';

const FeesView = ({ students = [], feesRecords = [], saveFeePayment, globalMonth }) => {
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
    const months = students.map(s => s.month).filter(Boolean);
    return [...new Set(months)].sort((a, b) => new Date(b) - new Date(a));
  }, [students]);

  useEffect(() => {
    if (selectedStudentId) {
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      if (selectedStudent?.joiningDate?.seconds) {
        const enrollmentDateStr = new Date(selectedStudent.joiningDate.seconds * 1000).toISOString().split('T')[0];
        setPaymentDate(enrollmentDateStr);
      } else {
        setPaymentDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedStudentId, students]);

  const effectiveMonth = useMemo(() => {
    if (feesMonthFilterMode === 'CurrentMonth') return globalMonth;
    if (feesMonthFilterMode === 'AllTime') return 'All';
    return feesMonthFilterMode;
  }, [feesMonthFilterMode, globalMonth]);

  // Strict String-Split Month Evaluator (Timezone and Locale Agnostic)
  const checkTransactionMonthMatch = (txDateString, targetMonthStr) => {
    if (!txDateString || !targetMonthStr || targetMonthStr === 'All') return false;
    
    const targetParts = targetMonthStr.trim().replace(/\s+/g, ' ').split(' ');
    if (targetParts.length !== 2) return false;
    const targetMonthName = targetParts[0].toLowerCase();
    const targetYearStr = targetParts[1];

    const dateParts = txDateString.split('-');
    if (dateParts.length !== 3) return false;
    
    const txYearStr = dateParts[0];
    const txMonthNum = parseInt(dateParts[1], 10);

    const monthsMap = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const txMonthName = monthsMap[txMonthNum - 1];

    return txMonthName === targetMonthName && txYearStr === targetYearStr;
  };

  // Pre-processed ledger mapping pass to supply structurally unified calculations
  const processedLedgerData = useMemo(() => {
    const activeAndCompleted = students.filter(s => s.status === 'Active' || s.status === 'Completed');
    
    return activeAndCompleted
      .map(student => {
        const totalFee = Number(student.totalFee) || 15000;
        const discount = Number(student.discount) || 0;
        const netExpected = totalFee - discount;

        const allStudentTx = feesRecords
          .filter(tx => tx.studentId === student.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalPaidAllTime = allStudentTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const matchingScopeTx = allStudentTx.filter(tx => 
          effectiveMonth === 'All' || checkTransactionMonthMatch(tx.date, effectiveMonth)
        );

        return {
          ...student,
          totalFee,
          discount,
          netExpected,
          paid: totalPaidAllTime,
          balance: Math.max(0, netExpected - totalPaidAllTime),
          paymentHistory: allStudentTx,
          hasTransactionsInScope: effectiveMonth === 'All' || matchingScopeTx.length > 0
        };
      })
      .sort((a, b) => (b.joiningDate?.seconds || 0) - (a.joiningDate?.seconds || 0));
  }, [students, feesRecords, effectiveMonth]);

  // Finance Stats: Strictly ignores "Completed" student balances during month view
  const financeStats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;

    processedLedgerData.forEach(student => {
      // If filtering by current month, completely ignore students who have Completed the course
      if (effectiveMonth !== 'All' && student.status === 'Completed') {
        student.paymentHistory.forEach(tx => {
          if (checkTransactionMonthMatch(tx.date, effectiveMonth)) {
            totalCollected += Number(tx.amount || 0);
          }
        });
        return;
      }

      const matchesMonthScope = effectiveMonth === 'All' || student.month === effectiveMonth || student.hasTransactionsInScope;
      
      if (matchesMonthScope) {
        totalExpected += student.netExpected;
        
        if (effectiveMonth === 'All') {
          totalCollected += student.paid;
        } else {
          student.paymentHistory.forEach(tx => {
            if (checkTransactionMonthMatch(tx.date, effectiveMonth)) {
              totalCollected += Number(tx.amount || 0);
            }
          });
        }
      }
    });

    return { expected: totalExpected, collected: totalCollected, pending: Math.max(0, totalExpected - totalCollected) };
  }, [processedLedgerData, effectiveMonth]);

  // FIXED: Filters out Completed students from the visual table if they haven't paid anything in the selected month
  const visibleLedgerRows = useMemo(() => {
    return processedLedgerData.filter(student => {
      if (effectiveMonth !== 'All') {
        // જો વિદ્યાર્થી Completed હોય, તો તે માત્ર ત્યારે જ દેખાશે જો તેણે આ ચાલુ મહિને કોઈ ફી ભરી હોય
        if (student.status === 'Completed' && !student.hasTransactionsInScope) {
          return false;
        }
        // Active વિદ્યાર્થીઓ માટે કાં તો એમનો બેચ-મહિનો મેચ થવો જોઈએ અથવા આ મહિને ટ્રાન્ઝેક્શન હોવું જોઈએ
        if (student.status === 'Active' && !student.hasTransactionsInScope && student.month !== effectiveMonth) {
          return false;
        }
      }
      
      const query = searchQuery.toLowerCase().trim();
      if (query === '') return true;
      
      return student.name.toLowerCase().includes(query) || student.course?.toLowerCase().includes(query);
    });
  }, [processedLedgerData, searchQuery, effectiveMonth]);

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
    alert(`Installment of ₹${paymentAmount} logged successfully!`);
    setPaymentAmount('');
    setPaymentRemarks('');
    setSelectedStudentId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      
      {/* Financial Metrics Widgets Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'Expected Revenue (Selected Scope)', value: financeStats.expected, icon: Landmark, color: 'text-blue-500', bg: 'bg-blue-500/5' },
          { label: 'Fees Collected', value: financeStats.collected, icon: IndianRupee, color: 'text-green-500', bg: 'bg-green-500/5' },
          { label: 'Outstanding Balance', value: financeStats.pending, icon: Receipt, color: 'text-red-500', bg: 'bg-red-500/5' }
        ].map((card, i) => (
          <div key={i} className="p-5 md:p-6 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between h-32 md:h-36">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}><card.icon className={card.color} size={20} /></div>
            <div>
              <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-gray-400 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{card.label}</p>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">₹{card.value.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Scope Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-gray-900 p-4 md:p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl shrink-0"><Filter size={20} /></div>
          <div className="flex flex-col flex-1 text-left min-w-0">
            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Fees Roster Scope</label>
            <select value={feesMonthFilterMode} onChange={e => setFeesMonthFilterMode(e.target.value)} className="bg-transparent text-xs md:text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer border-none p-0 focus:ring-0 max-w-full truncate">
              <option value="CurrentMonth">Active Month: {globalMonth}</option>
              <option value="AllTime">All-Time History Ledger</option>
              {availableMonths.map(m => <option key={m} value={m}>Historical: {m}</option>)}
            </select>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input type="text" placeholder="Search ledger by student or course..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COMPONENT: Ledger Table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[400px] shadow-xs">
          <div className="overflow-x-auto flex-1 w-full">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-gray-50 dark:bg-gray-950 text-gray-400 uppercase tracking-wider text-[9px] md:text-[10px] font-black border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="p-4 md:p-6">Student & Course</th>
                  <th className="p-4 md:p-6">Total Fee</th>
                  <th className="p-4 md:p-6">Paid</th>
                  <th className="p-4 md:p-6">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {visibleLedgerRows.map(student => {
                  const isExpanded = expandedStudentId === student.id;
                  return (
                    <React.Fragment key={student.id}>
                      <tr className={`hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-all cursor-pointer ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-500/5' : ''}`} onClick={() => { setSelectedStudentId(student.id); setExpandedStudentId(isExpanded ? null : student.id); }}>
                        <td className="p-4 md:p-6">
                          <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-xs md:text-sm">{student.name}</p>
                          <p className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{student.course}</p>
                        </td>
                        <td className="p-4 md:p-6 font-bold text-gray-700 dark:text-gray-300">₹{student.totalFee.toLocaleString('en-IN')}</td>
                        <td className="p-4 md:p-6 font-bold text-green-600">₹{student.paid.toLocaleString('en-IN')}</td>
                        <td className="p-4 md:p-6">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] md:text-[11px] ${student.balance <= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>₹{student.balance.toLocaleString('en-IN')}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/40 dark:bg-gray-950/30">
                          <td colSpan="4" className="p-4 md:p-6 border-t border-b border-gray-100 dark:border-gray-800/80">
                            <div className="space-y-3 max-w-xl w-full">
                              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2"><History size={12} className="text-indigo-500" /> Transaction Payment History Dates</p>
                              {student.paymentHistory.map((tx, index) => (
                                <div key={tx.id || index} className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/60 rounded-xl p-3 md:p-4 text-xs gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-black text-gray-800 dark:text-gray-200 text-xs">Installment Collected: <span className="text-green-600">₹{Number(tx.amount).toLocaleString('en-IN')}</span></p>
                                    <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5 truncate">Mode: {tx.mode || 'Cash'} {tx.remarks ? `| ${tx.remarks}` : ''}</p>
                                  </div>
                                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                    <span className="text-[9px] md:text-[10px] font-black bg-gray-50 dark:bg-gray-950 px-2 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800">{formatToDDMMYYYY(tx.date)}</span>
                                    <button onClick={(e) => {
                                      e.stopPropagation();
                                      const targetStudent = students.find(s => s.id === tx.studentId);
                                      if (!targetStudent) return alert("Student record profiles not found.");
                                      
                                      const studentFees = feesRecords.filter(f => f.studentId === targetStudent.id);
                                      const paid = studentFees.reduce((sum, currentTx) => sum + (Number(currentTx.amount) || 0), 0);
                                      const totalFee = Number(targetStudent.totalFee) || 0;
                                      const discount = Number(targetStudent.discount) || 0;
                                      const balance = Math.max(0, (totalFee - discount) - paid);

                                      downloadStatementReceipt(targetStudent, studentFees, { paid, balance });
                                    }} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-600 text-gray-500 hover:text-white rounded-lg transition-all border dark:border-gray-700" title="Download PDF Receipt"><Download size={14} /></button>
                                  </div>
                                </div>
                              ))}
                              {student.paymentHistory.length === 0 && <p className="text-xs text-gray-400 italic pl-1">No separate installment history logged yet.</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleLedgerRows.length === 0 && (
            <div className="p-16 text-center text-gray-400 font-bold italic text-xs">No matching ledger records matching parameters discovered.</div>
          )}
        </div>

        {/* RIGHT COMPONENT: Collect Installment Form */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-5 md:p-6 h-fit space-y-4 shadow-sm w-full">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-gray-900 dark:text-white"><ArrowUpRight size={18} className="text-indigo-500" /> Collect Installment</h3>
            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Post transaction receipt entry</p>
          </div>
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Select Student</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-bold outline-none cursor-pointer text-gray-800 dark:text-white focus:ring-1 focus:ring-indigo-500" required>
                <option value="">Choose Student Account</option>
                {students.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.name} ({s.course})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Collection Date</label>
              <div className="relative w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center justify-between cursor-pointer focus-within:ring-1 focus-within:ring-indigo-500">
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatToDDMMYYYY(paymentDate)}</span>
                <CalendarIcon size={14} className="text-gray-400" />
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Amount Received (₹)</label>
              <input type="number" placeholder="Amount in INR" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-bold text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Payment Method Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {['Cash', 'UPI', 'Net Banking', 'Cheque'].map(mode => <button key={mode} type="button" onClick={() => setPaymentMode(mode)} className={`p-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{mode}</button>)}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Remarks / Receipt No.</label>
              <input type="text" placeholder="Installment 1, Receipt Ref, etc." value={paymentRemarks} onChange={e => setPaymentRemarks(e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 font-medium text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 py-3.5 rounded-xl font-black uppercase tracking-widest text-white text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer">Log Payment Receipt</button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default FeesView;