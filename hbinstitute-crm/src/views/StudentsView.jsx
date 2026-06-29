import React, { useMemo } from 'react';
import { Search, Filter, Clock, Edit3, Trash2, CheckSquare, DollarSign, Download, Award } from 'lucide-react';
import { STUDENT_STATUS } from '../constants/options';
import { formatLongDate } from '../utils/helpers';
// import InstituteLogo from '../assets/2231B0A7-6B93-4CCF-AAC6-14A13C40CF2F.JPG.jpeg';
// import signatory from '../assets/signatory.PNG';
import { generateCertificate } from '../utils/pdfGenerator';
import { downloadStatementReceipt } from '../utils/statementPrinter';


const StudentsView = ({ studentSearch, setStudentSearch, globalMonth, setGlobalMonth, studentMonthOptions, studentViewMode, setStudentViewMode, selectedStatus, setSelectedStatus, filteredStudents, studentsTimelineEvents, editStudent, deleteStudent, students, leads, attendanceRecords = [], feesRecords = [] }) => {

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

  // const downloadStudentStatementPDF = (student, totalFee, paid, balance) => {
  //   const studentHistory = feesRecords.filter(tx => tx.studentId === student.id).sort((a, b) => new Date(a.date) - new Date(b.date));
  //   const cleanStudentName = student.name.replace(/\s+/g, '_');
  //   const discount = Number(student.discount) || 0;

  //   // Cache the absolute master title state from your App context
  //   const originalAppTitle = window.document.title;

  //   // FORCE ENFORCEMENT STEP 1: Overwrite root window parameters instantly 
  //   // to bypass edge print pipeline isolation loops
  //   window.document.title = `${cleanStudentName}_Fees_Statement`;

  //   const htmlInvoiceContent = `
  //     <html>
  //       <head>
  //         <title>${cleanStudentName}_Fees_Statement</title>
  //         <style>
  //           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  //           * { box-sizing: border-box; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
  //           body { background: #ffffff; color: #1e293b; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  //           .receipt-frame { border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; max-width: 700px; margin: 0 auto; position: relative; }
  //           .header-strip { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
  //           .brand-title { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; color: #4f46e5; text-transform: uppercase; }
  //           .brand-subtitle { font-size: 11px; font-weight: 700; color: #64748b; tracking: 0.05em; text-transform: uppercase; margin-top: 2px; }
  //           .brand-contact { font-size: 11px; color: #64748b; line-height: 1.5; font-weight: 500; margin-top: 6px; max-width: 320px; }
  //           .invoice-label { font-size: 20px; font-weight: 900; text-transform: uppercase; text-align: right; color: #0f172a; }
  //           .meta-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
  //           .meta-block p { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
  //           .meta-block h4 { font-size: 15px; color: #0f172a; font-weight: 800; text-transform: uppercase; }
  //           .table-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; }
  //           .table-box th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  //           .table-box td { padding: 16px; font-size: 13px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
  //           .closing-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
  //           .summary-box { background: #f8fafc; border-radius: 18px; padding: 20px; width: 340px; }
  //           .summary-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #64748b; padding: 5px 0; }
  //           .summary-row.discount-row { color: #dc2626; font-weight: 700; }
  //           .summary-row.total-row { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 6px; font-size: 15px; font-weight: 900; color: #4f46e5; }
  //           .signatory-container { text-align: center; width: 220px; }
  //           .signatory-image { width: 160px; height: auto; display: block; margin: 0 auto -5px auto; mix-blend-mode: multiply; }
  //           .signatory-line { border-top: 1px solid #cbd5e1; margin-top: 5px; padding-top: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; tracking: 0.05em; color: #475569; }
  //           .footer-msg { text-align: center; margin-top: 40px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
  //         </style>
  //       </head>
  //       <body>
  //         <div class="receipt-frame">
  //           <div class="header-strip">
  //             <div>
  //               <h1 class="brand-title">H.B.INSTITUTE</h1>
  //               <p class="brand-subtitle">The Training Center</p>
  //               <p class="brand-contact">
  //                 West Gate Shops & Corporate Offices, A-221, 150 Ft. Ring Road, Raiya Road, Rajkot - 360005<br/>
  //                 Call: +91 94844 33960 | inquiry@hbinstitute.co.in<br/>
  //                 Web: www.hbinstitute.co.in
  //               </p>
  //             </div>
  //             <div>
  //               <h2 class="invoice-label">Fees Ledger Statement</h2>
  //               <p style="font-size:12px; font-weight:700; color:#64748b; text-align:right; margin-top:4px;">As of: ${new Date().toLocaleDateString('en-GB')}</p>
  //             </div>
  //           </div>

  //           <div class="meta-grid">
  //             <div class="meta-block">
  //               <p>Student Name</p>
  //               <h4>${student.name}</h4>
  //               <span style="font-size:11px; font-weight:600; color:#94a3b8;">Course: ${student.course}</span>
  //             </div>
  //             <div class="meta-block" style="text-align: right;">
  //               <p>Account Metadata</p>
  //               <h4>ID: ${student.id.slice(0, 8).toUpperCase()}</h4>
  //               <span style="font-size:11px; font-weight:600; color:#94a3b8;">Mobile: ${student.mobile || 'N/A'}</span>
  //             </div>
  //           </div>

  //           <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; tracking: 0.05em; margin-bottom: 10px;">Itemized Installment Transactions</p>
  //           <table class="table-box">
  //             <thead>
  //               <tr>
  //                 <th>Date</th>
  //                 <th>Method</th>
  //                 <th>Remarks/Ref</th>
  //                 <th style="text-align: right;">Amount</th>
  //               </tr>
  //             </thead>
  //             <tbody>
  //               ${studentHistory.map(tx => `
  //                 <tr>
  //                   <td>${tx.date ? tx.date.split('-').reverse().join('/') : 'N/A'}</td>
  //                   <td>${tx.mode || 'Cash'}</td>
  //                   <td style="color:#64748b; font-size:12px;">${tx.remarks || 'Installment Entry'}</td>
  //                   <td style="text-align: right; font-weight: 800;">₹${Number(tx.amount).toLocaleString('en-IN')}.00</td>
  //                 </tr>
  //               `).join('')}
  //             </tbody>
  //           </table>

  //           <div class="closing-block">
  //             <div class="signatory-container">
  //             <img src="${signatory}" alt="" width="293" height="50" class="signatory-image" alt="Authorized Signatory Seal" />               <div class="signatory-line">Authorized Signatory</div>
  //             </div>

  //             <div class="summary-box">
  //               <div class="summary-row"><span>Gross Course Fee</span><span>₹${totalFee.toLocaleString('en-IN')}.00</span></div>
  //               <div class="summary-row discount-row"><span>Discount Allowed (-)</span><span>₹${discount.toLocaleString('en-IN')}.00</span></div>
  //               <div class="summary-row" style="border-top: 1px solid #f1f5f9; padding-top: 6px; font-weight: 700; color: #0f172a;"><span>Net Payable Fee</span><span>₹${(totalFee - discount).toLocaleString('en-IN')}.00</span></div>
  //               <div class="summary-row"><span>Total Paid Collections</span><span style="color:#16a34a; font-weight:700;">₹${paid.toLocaleString('en-IN')}.00</span></div>
  //               <div class="summary-row total-row"><span>Outstanding Dues</span><span>₹${balance.toLocaleString('en-IN')}.00</span></div>
  //             </div>
  //           </div>

  //           <div class="footer-msg">Thank you for learning with us!</div>
  //         </div>
  //         <script>
  //           window.onload = function() { window.print(); };
  //         </style>
  //       </body>
  //     </html>
  //   `;

  //   const printFrame = document.createElement('iframe');
  //   printFrame.style.position = 'fixed';
  //   printFrame.style.width = '0';
  //   printFrame.style.height = '0';
  //   printFrame.style.border = '0';
  //   document.body.appendChild(printFrame);

  //   const docRef = printFrame.contentWindow.document;
  //   docRef.open();
  //   docRef.write(htmlInvoiceContent);
  //   docRef.close();

  //   setTimeout(() => {
  //     printFrame.contentWindow.focus();
  //     printFrame.contentWindow.print();

  //     // FORCE ENFORCEMENT STEP 2: Restore the exact main system tab header title 
  //     // immediately after the browser hands off control to the local print pipeline
  //     window.document.title = originalAppTitle;

  //     setTimeout(() => {
  //       document.body.removeChild(printFrame);
  //     }, 1000);
  //   }, 250);
  // };

  // const downloadCertificate = (student) => {
  //   const cleanStudentName = student.name.replace(/\s+/g, '_');
  //   const certificateNo = student.id.toUpperCase();
  //   // 1. Isolate the completion raw text entry string
  //   let rawTargetDate = '';
  //   if (student.statusHistory && student.statusHistory['Completed']) {
  //     rawTargetDate = student.statusHistory['Completed'];
  //   } else if (student.joiningDate?.seconds) {
  //     rawTargetDate = student.joiningDate.seconds * 1000;
  //   }

  //   // 2. Format explicitly to: Weekday Month Name dd, yyyy
  //   let completionDateStr = '';
  //   if (rawTargetDate) {
  //     // Clean string mutations (e.g., strips " at 10:47 PM")
  //     let cleanStr = String(rawTargetDate).replace(/\s+/g, ' ').replace(/,+/g, '').replace(/-/g, ' ').split(' at ')[0];
  //     const parsedDate = new Date(cleanStr);

  //     if (!isNaN(parsedDate.getTime())) {
  //       // Enforce specific token configurations matching your template rule
  //       const options = { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' };
  //       // Output format example: "Friday June 12, 2026"
  //       completionDateStr = parsedDate.toLocaleDateString('en-US', options).replace(/,/g, '');
  //     } else {
  //       // Fallback default format layout
  //       completionDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).replace(/,/g, '');
  //     }
  //   } else {
  //     completionDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).replace(/,/g, '');
  //   }

  //   const htmlCertificateContent = `
  //     <html>
  //       <head>
  //         <title>${cleanStudentName}_Certificate</title>
  //         <style>
  //           @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

  //           * { box-sizing: border-box; margin: 0; padding: 0; }

  //           @page {
  //             size: landscape;
  //             margin: 0;
  //           }

  //           body { 
  //             background: #ffffff; 
  //             display: flex; 
  //             justify-content: center; 
  //             align-items: center; 
  //             height: 100vh;
  //             width: 100vw;
  //             font-family: 'Montserrat', sans-serif;
  //             -webkit-print-color-adjust: exact; 
  //             print-color-adjust: exact; 
  //           }

  //           /* Strict 4:3 Landscape Dimensions */
  //           .cert-container { 
  //             width: 1024px; 
  //             height: 768px; 
  //             position: relative;
  //             background: #ffffff;
  //             overflow: hidden;
  //             display: flex;
  //             flex-direction: row; /* Forces horizontal split side-by-side */
  //           }

  //           /* Left Side Layout Group (Triangle and Ribbon Badge) */
  //           .left-side-graphics {
  //             width: 320px;
  //             height: 100%;
  //             position: relative;
  //             flex-shrink: 0;
  //           }

  //           /* Upper-Left Turquoise Geometric Corner */
  //           .left-side-graphics::before {
  //             content: '';
  //             position: absolute;
  //             top: 0;
  //             left: 0;
  //             width: 350px;
  //             height: 350px;
  //             background: #1bcca2;
  //             clip-path: polygon(0 0, 100% 0, 0 100%);
  //             z-index: 1;
  //           }

  //           /* SVG Achievement Seal Badge Alignment */
  //           .award-badge {
  //             position: absolute;
  //             top: 80px;
  //             left: 80px;
  //             width: 160px;
  //             height: auto;
  //             z-index: 2;
  //           }

  //           /* Right Side Main Content Panel */
  //           .right-side-content {
  //             flex-1;
  //             height: 100%;
  //             padding: 60px 60px 60px 20px;
  //             display: flex;
  //             flex-direction: column;
  //             justify-content: space-between; /* Ensures footer stays pinned to bottom */
  //             align-items: flex-start;
  //             position: relative;
  //             z-index: 3;
  //           }

  //           /* Header Institutional Info Branding Layout */
  //           .cert-header {
  //             width: 100%;
  //             text-align: left;
  //             margin-bottom: 20px;
  //           }
  //           .institute-title {
  //             font-size: 34px;
  //             font-weight: 800;
  //             color: #0d5484;
  //             letter-spacing: 0.02em;
  //             text-transform: uppercase;
  //             line-height: 1.2;
  //             margin-bottom: 6px;
  //           }
  //           .institute-motto {
  //             font-size: 16px;
  //             font-weight: 600;
  //             color: #0d5484;
  //             text-transform: uppercase;
  //             letter-spacing: 0.15em;
  //           }

  //           /* Central Credential Text Information Wrapper */
  //           .cert-body {
  //             width: 100%;
  //             text-align: left;
  //             margin-top: -20px;
  //           }
  //           .cert-main-title {
  //             font-size: 40px;
  //             font-weight: 800;
  //             color: #0d5484;
  //             text-transform: uppercase;
  //             letter-spacing: 0.04em;
  //             border-bottom: 5px solid #0d5484;
  //             padding-bottom: 8px;
  //             display: inline-block;
  //             width: 100%;
  //             max-width: 580px;
  //             margin-bottom: 35px;
  //           }
  //           .cert-attribution {
  //             font-size: 16px;
  //             font-weight: 600;
  //             color: #0d5484;
  //             text-transform: uppercase;
  //             letter-spacing: 0.08em;
  //             margin-bottom: 20px;
  //           }
  //           .student-name {
  //             font-size: 42px;
  //             font-weight: 700;
  //             color: #1e293b;
  //             margin-bottom: 35px;
  //           }
  //           .course-name {
  //             font-size: 42px;
  //             font-weight: 700;
  //             color: #0d5484;
  //             margin-bottom: 35px;
  //           }
  //           .cert-description {
  //             font-size: 19px;
  //             font-weight: 500;
  //             color: #334155;
  //             line-height: 1.6;
  //             max-width: 600px;
  //           }
  //           .course-highlight {
  //             font-weight: 700;
  //             color: #0d5484;
  //           }

  //           /* Footer Security and Authorization Signature Alignment Block */
  //           .cert-footer {
  //             width: 100%;
  //             display: flex;
  //             justify-content: space-between;
  //             align-items: flex-end;
  //           }

  //           /* Left Base Anchor Signatory Line layout */
  //           .signatory-container {
  //             display: flex;
  //             flex-direction: column;
  //             align-items: center;
  //             width: 250px;
  //             text-align: center;
  //           }
  //           .date-placeholder {
  //             font-size: 14px;
  //             font-weight: 700;
  //             color: #1bcca2;
  //             text-transform: uppercase;
  //             margin-bottom: 4px;
  //           }
  //           .signature-rule {
  //             width: 100%;
  //             border-top: 4px solid #0d5484;
  //             margin-top: 4px;
  //             padding-top: 6px;
  //           }
  //           .signer-name {
  //             font-size: 16px;
  //             font-weight: 800;
  //             color: #1bcca2;
  //             text-transform: uppercase;
  //             letter-spacing: 0.02em;
  //           }
  //           .signer-title {
  //             font-size: 13px;
  //             font-weight: 600;
  //             color: #0d5484;
  //           }

  //           /* System Tracking Data Identification Copy */
  //           .meta-block {
  //             font-size: 10px;
  //             font-weight: 600;
  //             color: #64748b;
  //             text-align: right;
  //             line-height: 1.5;
  //           }
  //           .meta-value {
  //             font-weight: 700;
  //             color: #0d5484;
  //           }

  //           .corner-brand {
  //             background: #000000; 
  //             padding: 5px 10px; 
  //             border-radius: 6px; 
  //             margin-top: 6px;
  //             display: inline-block;
  //           }
  //           .corner-brand-text {
  //             color: #ffffff; 
  //             font-family: 'Montserrat', sans-serif; 
  //             font-weight: 800; 
  //             font-size: 16px; 
  //             letter-spacing: -1px;
  //           }
  //         </style>
  //       </head>
  //       <body>
  //         <div class="cert-container">

  //           <div class="left-side-graphics">
  //             <svg class="award-badge" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  //               <path d="M 35 60 L 20 90 L 35 83 L 50 90 Z" fill="#0d5484" />
  //               <path d="M 65 60 L 50 90 L 65 83 L 80 90 Z" fill="#0d5484" />
  //               <circle cx="50" cy="45" r="28" fill="#083e63" />
  //               <circle cx="50" cy="45" r="25" fill="#1bcca2" clip-path="polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" opacity="0.15"/>
  //               <path d="M 50 20 C 36 20, 25 31, 25 45 C 25 59, 36 70, 50 70 C 64 70, 75 59, 75 45 C 75 31, 64 20, 50 20 Z" fill="none" stroke="#0d5484" stroke-width="3" stroke-dasharray="2 1.5"/>
  //               <polygon points="50,28 55,39 67,41 58,49 61,61 50,55 39,61 42,49 33,41 45,39" fill="#ffffff" />
  //             </svg>
  //           </div>

  //           <div class="right-side-content">

  //             <div class="cert-header">
  //               <h1 class="institute-title">H.B.INSTITUTE - THE TRAINING CENTER</h1>
  //               <p class="institute-motto">Where Passion Meets Education</p>
  //             </div>

  //             <div class="cert-body">
  //               <h2 class="cert-main-title">Certificate of Achievement</h2>
  //               <p class="cert-attribution">This is presented to</p>
  //               <div class="student-name">${student.name}</div>
  //               <p class="cert-description">
  //                 for exemplary performance in the specialized dynamic course training track of
  //                 <div class="course-name mb-0">${student.course || 'Information Technology'}</div>
  //               </p>
  //             </div>

  //             <div class="cert-footer">
  //               <div class="signatory-container">
  //                 <div class="signatory-container">
  //                   <img src="${signatory}" alt="" width="293" height=100" class="signatory-image" alt="Authorized Signatory Seal" /> 
  //                   <div class="signatory-line">Authorized Signatory</div>
  //                 </div>
  //                 <div class="signature-rule"></div>
  //                 <div class="signer-name">Shyam Bhojak</div>
  //                 <div class="signer-title">CEO & Founder</div>
  //               </div>

  //               <div style="display: flex; flex-direction: column; align-items: flex-end;">
  //                 <div class="meta-block">
  //                   <div>ISSUED DATE: <span class="date-placeholder">${completionDateStr}</span></div>
  //                   <div>ID: <span class="meta-value">${certificateNo}</span></div>

  //                 </div>
  //                 <div>
  //                   <img src="${InstituteLogo}" alt="" width="75" height="75" />
  //                 </div>
  //               </div>
  //             </div>

  //           </div>

  //         </div>
  //       </body>
  //     </html>
  //   `;

  //   const blob = new Blob(
  //     [htmlCertificateContent],
  //     { type: 'text/html' }
  //   );

  //   const url = URL.createObjectURL(blob);

  //   window.open(url, '_blank');
  // };

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
          {filteredStudents.map((student) => {
            const attendance = studentAttendanceMetrics[student.id];
            const attendanceRatio = attendance?.total ? Math.round((attendance.present / attendance.total) * 100) : 0;
            const textRatio = attendance?.total ? `${attendance.present}/${attendance.total} Days` : 'No sessions marked';
            const totalCourseFee = Number(student.totalFee) || 0;
            const allowedDiscount = Number(student.discount) || 0; // <-- Fetch allowed discount
            const paidInstallments = studentFinancialMetrics[student.id] || 0;
            const netExpectedFee = totalCourseFee - allowedDiscount;
            const isFullyPaid = student.feesStatus === 'Paid' || (netExpectedFee > 0 && (netExpectedFee - paidInstallments) <= 0);
            // Outstanding Due evaluation formula includes discounts safely
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
                      {/* Inside the student card loop in StudentsView.jsx */}
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
                    {/* NEW: Display Multiple Assigned Faculties as Badges */}
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
                        // Filter the global master records down to this specific student's ledger logs
                        const studentFees = feesRecords.filter(f => f.studentId === student.id);

                        // Re-calculate local metrics on the fly matching the model schema hook rules
                        const paid = studentFees.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
                        const totalFee = Number(student.totalFee) || 0;
                        const discount = Number(student.discount) || 0;
                        const balance = Math.max(0, (totalFee - discount) - paid);

                        const computedMetrics = { paid, balance };

                        // Run the printing matrix instantly!
                        downloadStatementReceipt(student, studentFees, computedMetrics);
                      }}
                      className="p-2 text-gray-400 hover:text-emerald-500 transition-colors" title="Print Ledger Statement PDF"><Download size={16} /></button>
                    {/* New Conditional Certificate Button */}
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
      )
      }
    </div >
  );
};

export default StudentsView;