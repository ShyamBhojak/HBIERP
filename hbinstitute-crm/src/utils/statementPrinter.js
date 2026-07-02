import InstituteLogo from '../assets/2231B0A7-6B93-4CCF-AAC6-14A13C40CF2F.JPG.jpeg';
import signatory from '../assets/signatory.PNG';

/**
 * Generates and prints a clean, professional financial ledger statement for a student.
 * @param {Object} studentProfile - The current master student profile record
 * @param {Array} feesRecords - The full array of transaction history logs
 * @param {Object} metrics - Computed monetary metrics (paid, balance, etc.)
 */
export const downloadStatementReceipt = (studentProfile, feesRecords, metrics) => {
  if (!studentProfile) return;

  const sortedHistory = [...feesRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
  const cleanStudentName = studentProfile.name.replace(/\s+/g, '_');
  const originalTitle = window.document.title;
  window.document.title = `${cleanStudentName}_Fees_Statement`;

  // Safely resolve the student's assigned course track listing description layout string
  const resolvedCourseDisplay = studentProfile.courses && Array.isArray(studentProfile.courses)
    ? studentProfile.courses.map(c => typeof c === 'object' ? c.name : c).join(', ')
    : (typeof studentProfile.course === 'object' ? studentProfile.course.name : (studentProfile.course || 'N/A'));

  const htmlInvoiceContent = `
    <html>
      <head>
        <title>${cleanStudentName}_Fees_Statement</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          * { box-sizing: border-box; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
          body { background: #ffffff; color: #1e293b; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-frame { border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; max-width: 740px; margin: 0 auto; }
          .header-strip { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
          .logo-placeholder { width: 75px; height: 74px; object-fit: contain; border-radius: 12px; margin-right: 15px; }
          .brand-title { font-size: 22px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: -0.025em; }
          .brand-subtitle { font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; tracking: 0.05em; margin-top: 1px; }
          .brand-contact { font-size: 10px; color: #64748b; line-height: 1.5; font-weight: 600; margin-top: 5px; }
          .invoice-label { font-size: 18px; font-weight: 900; text-transform: uppercase; text-align: right; color: #0f172a; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px solid #f1f5f9; gap: 12px; }
          .meta-block p { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 3px; }
          .meta-block h4 { font-size: 14px; color: #0f172a; font-weight: 800; text-transform: uppercase; }
          .table-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table-box th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
          .table-box td { padding: 14px 16px; font-size: 12px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
          .closing-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
          .summary-box { background: #f8fafc; border-radius: 18px; padding: 20px; width: 340px; border: 1px solid #e2e8f0; }
          .summary-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; padding: 5px 0; color: #475569; }
          .summary-row.total-row { border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 6px; font-size: 14px; font-weight: 900; color: #4f46e5; }
          .signatory-container { text-align: center; width: 220px; }
          .signatory-image { width: 160px; height: auto; display: block; margin: 0 auto -5px auto; mix-blend-mode: multiply; }
          .signatory-line { border-top: 1px solid #cbd5e1; margin-top: 5px; padding-top: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; tracking: 0.05em; color: #475569; }
          .footer-msg { text-align: center; margin-top: 40px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="receipt-frame">
          <div class="header-strip">
            <div style="display: flex; align-items: center;">
              <img src="${window.location.origin + InstituteLogo}" class="logo-placeholder" alt="Logo" />
              <div>
                <h1 class="brand-title">H.B.INSTITUTE</h1>
                <p class="brand-subtitle">The Training Center</p>
                <p class="brand-contact">
                  West Gate, A-221, 150 Ft. Ring Road, Raiya Road, Rajkot - 360007<br/>
                  Call: +91 94844 33960 | Web: https://hbinstitute.co.in<br/>
                  Email: inquiry@hbinstitute.co.in
                </p>
              </div>
            </div>
            <div>
              <h2 class="invoice-label">Fees Statement</h2>
              <p style="font-size:11px; font-weight:800; color:#64748b; text-align:right; margin-top:4px;">Date: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-block">
              <p>Student Name</p>
              <h4>${studentProfile.name}</h4>
              <h4 style="color: #4f46e5;">${resolvedCourseDisplay}</h4>
            </div>
            <div class="meta-block" style="text-align: right;">
              <p>Student Reference</p>
              <h4>ID: ${studentProfile.id.toUpperCase()}</h4>
            </div>
          </div>
          
          <table class="table-box">
            <thead>
              <tr><th>Date</th><th>Method</th><th>Remarks</th><th style="text-align: right;">Amount</th></tr>
            </thead>
            <tbody>
              ${sortedHistory.map(tx => `
                <tr>
                  <td>${tx.date ? tx.date.split('-').reverse().join('/') : 'N/A'}</td>
                  <td>${tx.mode || 'Cash'}</td>
                  <td>${tx.remarks || 'Installment Entry'}</td>
                  <td style="text-align: right; font-weight: 800; color: #0f172a;">₹${Number(tx.amount).toLocaleString('en-IN')}.00</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="closing-block">
            <div class="signatory-container">
              <img src="${signatory}" alt="Authorized Signatory Seal" width="293" height="50" class="signatory-image" />
              <div class="signatory-line">Authorized Signatory</div>
            </div>
            <div class="summary-box">
              <div class="summary-row"><span>Gross Tuition Fee</span><span>₹${(Number(studentProfile.totalFee) || 0).toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row" style="color: #dc2626;"><span>Allowed Discount (-)</span><span>₹${(Number(studentProfile.discount) || 0).toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row"><span>Total Paid Collected</span><span>₹${metrics.paid.toLocaleString('en-IN')}.00</span></div>
              <div class="summary-row total-row"><span>Outstanding Balance</span><span>₹${metrics.balance.toLocaleString('en-IN')}.00</span></div>
            </div>
          </div>
          <div class="footer-msg">Thank you for learning with us!</div>
        </div>
      </body>
    </html>
  `;

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed'; printFrame.style.width = '0'; printFrame.style.height = '0'; printFrame.style.border = '0';
  document.body.appendChild(printFrame);
  const docRef = printFrame.contentWindow.document;
  docRef.open(); docRef.write(htmlInvoiceContent); docRef.close();

  setTimeout(() => {
    printFrame.contentWindow.focus(); printFrame.contentWindow.print();
    window.document.title = originalTitle;
    setTimeout(() => { if (printFrame.parentNode) document.body.removeChild(printFrame); }, 1000);
  }, 250);
};