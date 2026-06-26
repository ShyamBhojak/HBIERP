import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, appId } from '../config/firebase';
import { Award, Download, CheckSquare, DollarSign, User, BookOpen, Calendar, LogOut, Clock, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { generateCertificate } from '../utils/pdfGenerator';

const StudentPortal = ({ user, studentProfileProp }) => {
  const [studentProfile, setStudentProfile] = useState(studentProfileProp);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [feesRecords, setFeesRecords] = useState([]);
  const [sessionUpdates, setSessionUpdates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(!studentProfileProp);

  // Assignment submission workflow execution tracking states
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (studentProfileProp) {
      setStudentProfile(studentProfileProp);
      setLoading(false);
    }
  }, [studentProfileProp]);

  // Real-time Database Event Stream Subscriptions
  useEffect(() => {
    if (!studentProfile?.id) return;

    const unsubscribeAtt = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
      (snapshot) => {
        setAttendanceRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubscribeFees = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'fees'),
      (snapshot) => {
        const allFees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeesRecords(allFees.filter(tx => tx.studentId === studentProfile.id));
      }
    );

    const unsubscribeSessions = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'session_updates'),
      (snapshot) => {
        const allSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredSessions = allSessions.filter(session =>
          session.assignedStudentIds?.includes(studentProfile.id)
        );
        setSessionUpdates(filteredSessions.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      }
    );

    const unsubscribeAssignments = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'assignments'),
      (snapshot) => {
        const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const matchingTasks = allTasks.filter(task =>
          task.assignedStudentIds?.includes(studentProfile.id)
        );
        setAssignments(matchingTasks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      }
    );

    return () => {
      unsubscribeAtt();
      unsubscribeFees();
      unsubscribeSessions();
      unsubscribeAssignments();
    };
  }, [studentProfile]);

  // Compute Metrics matching Admin View Logic
  const metrics = useMemo(() => {
    if (!studentProfile?.id) return { present: 0, total: 0, ratio: 0, paid: 0, balance: 0 };

    let present = 0, total = 0;
    attendanceRecords.forEach(sheet => {
      if (sheet.records && sheet.records[studentProfile.id]) {
        const status = sheet.records[studentProfile.id];
        if (status === 'Present') present += 1;
        if (status && status !== 'Cancelled') total += 1;
      }
    });

    const paid = feesRecords.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const totalCourseFee = Number(studentProfile.totalFee) || 0;
    const allowedDiscount = Number(studentProfile.discount) || 0;
    const netPayable = totalCourseFee - allowedDiscount;
    const balance = Math.max(0, netPayable - paid);

    return {
      present,
      total,
      ratio: total ? Math.round((present / total) * 100) : 0,
      paid,
      balance
    };
  }, [attendanceRecords, feesRecords, studentProfile]);

  // Submission Turn-In pipeline handler
  const handleTurnInAssignment = async (taskId) => {
    if (!studentNotes.trim() && !submissionFile) {
      alert("Please compose a written solution or choose a complete submission file.");
      return;
    }

    setSubmitting(true);
    let attachedFileUrl = '';
    let attachedFileName = '';

    try {
      if (submissionFile) {
        const uniqueId = `${Date.now()}_sub_${studentProfile.id}_${submissionFile.name}`;
        const storageRef = ref(storage, `submissions/${uniqueId}`);
        const snapshot = await uploadBytes(storageRef, submissionFile);
        attachedFileUrl = await getDownloadURL(snapshot.ref);
        attachedFileName = submissionFile.name;
      }

      const assignmentDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'assignments', taskId);
      await updateDoc(assignmentDocRef, {
        [`submissions.${studentProfile.id}`]: 'Completed',
        [`submissionDetails.${studentProfile.id}`]: {
          turnedInAt: new Date().toLocaleString('en-IN'),
          studentNotes: studentNotes,
          fileUrl: attachedFileUrl || null,
          fileName: attachedFileName || null
        }
      });

      alert("Success: Assignment uploaded and turned in successfully!");
      setActiveSubmissionId(null);
      setStudentNotes('');
      setSubmissionFile(null);
    } catch (err) {
      console.error("Submission operational loop exception failure:", err);
      alert("Could not process and dispatch submission payload parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (loading) return <div className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-indigo-500 font-bold">Initializing Student Portal...</div>;
  if (!studentProfile) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">No registered student profile found for {user?.email}</div>;

  const downloadStatementReceipt = () => {
    const sortedHistory = [...feesRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
    const cleanStudentName = studentProfile.name.replace(/\s+/g, '_');
    const originalTitle = window.document.title;
    window.document.title = `${cleanStudentName}_Fees_Statement`;

    const htmlInvoiceContent = `
      <html>
        <head>
          <title>${cleanStudentName}_Fees_Statement</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            * { box-sizing: border-box; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
            body { background: #ffffff; color: #1e293b; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt-frame { border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; max-width: 700px; margin: 0 auto; }
            .header-strip { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
            .brand-title { font-size: 24px; font-weight: 900; color: #4f46e5; text-transform: uppercase; }
            .brand-subtitle { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px; }
            .brand-contact { font-size: 11px; color: #64748b; line-height: 1.5; font-weight: 500; margin-top: 6px; }
            .invoice-label { font-size: 20px; font-weight: 900; text-transform: uppercase; text-align: right; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .meta-block h4 { font-size: 15px; color: #0f172a; font-weight: 800; text-transform: uppercase; }
            .table-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table-box th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
            .table-box td { padding: 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
            .closing-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
            .summary-box { background: #f8fafc; border-radius: 18px; padding: 20px; width: 340px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 5px 0; }
            .summary-row.total-row { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 6px; font-size: 15px; font-weight: 900; color: #4f46e5; }
            .signatory-container { text-align: center; width: 220px; }
            .signatory-image { width: 160px; height: auto; display: block; margin: 0 auto -5px auto; mix-blend-mode: multiply; }
            .signatory-line { border-top: 1px solid #cbd5e1; margin-top: 5px; padding-top: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; tracking: 0.05em; color: #475569; }

          </style>
        </head>
        <body>
          <div class="receipt-frame">
            <div class="header-strip">
              <div>
                <h1 class="brand-title">H.B.INSTITUTE</h1>
                <p class="brand-subtitle">The Training Center</p>
                <p class="brand-contact">West Gate Shops, Rajkot | Call: +91 94844 33960</p>
              </div>
              <div>
                <h2 class="invoice-label">Fees Ledger Statement</h2>
                <p style="font-size:12px; font-weight:700; color:#64748b; text-align:right;">As of: ${new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>
            <div class="meta-grid">
              <div class="meta-block">
                <p style="font-size: 12px; color: #64748b;">Student Name</p>
                <h4>${studentProfile.name}</h4>
              </div>
              <div class="meta-block" style="text-align: right;">
                <p style="font-size: 12px; color: #64748b;">Account Metadata</p>
                <h4>ID: ${studentProfile.id.slice(0, 8).toUpperCase()}</h4>
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
                    <td style="text-align: right; font-weight: 800;">₹${Number(tx.amount).toLocaleString('en-IN')}.00</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="closing-block">
              <div class="signatory-container">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASUAAAFWCAYAAAAv0YsYAAAACXBIWXMAAA7EAAAOxAGVKw4bAABtGklEQVR4nO2dB5wURdrG36rqOGlzIC4ZQcEsIiYMBMlBFPVMd6eX03f5zsvn5Xyep54BBckZREQUcxZM5ByWzbuTO1XVV70eHEtc2DQL9ffHz5nu6p7ZmZ6n33reqrcwSCQSSQaBQSKRSDIIKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjkKIkkUgyCilKEokko5CiJJFIMgopShKJJKOQoiSRSDIKKUoSiSSjUEAikbQN2RO3AQcVaeo5vHJ2DCT1SFGSSJqFqx8G0ywBok6BxJLoiVobxVMjHOMOlDkmED3fA8gYUcrTR+eriqID5yZjtLPYlEaAKSB+Nuc0C2MUp9TlrmcblHohBjSiYK0cY7LX8byVSXjFgiYgRUmS2eDr7gOCA+A+9wPIZPJyzjJ1coWVtFdxgEtOfAAv5tw1gXHAhpINjaQwfzipqFpJ/cedi8coCFAXghXD38WBdQdOC8TrmwgprhCULEqVV4XwnccYchG4nTAiJuaoM8FY98/heW4nTTVjlFGuEFLLAWV7ntUlGDRxKhXXNF3VuTgh9agaDIZUDhQ8SsG2GKhMEdsxYIwBIfFVYQVQ0t3P7Esfdji7n8LbDpwCCCSSTCZ4wyYSMrpjz7jVrX56LmQq2eP+EAiQb9ueC5iEvuTun/ngsZrqeWOCjGjjMCEzPM+D3PzCX9ZVVu9wU2kXXDtECLIRd7N1Q1vBGd2Tij+frH+JrOtNFeNhhq52FmKkIkSY6P5dqmmm+B2zPEbtXM55rmiaryia2MQNhpRyj7kuFa+DuFdEPR4Q5weEkRAkCpwhIMQXFgSKooCiqkJwbAgEwmK/A5pmQCwWBSFmIN4P6OJ5TV210FQqTi/iOyFYvopwxgALifTPJ6IpqKuNzkrDu1PhFJCiJMlsQiM2KsFACXK1kW7NrDWQoaCs8TlGgOxmmIfAYzWcqhc5VXN3HKu9UjhpMlHQXOAIcvILf1f20QPfh2agpOONiHOW50cuDqPZlEG1xxlWMKkVAc6VmhrsEdTNcxF3Bpi6GlFVXOC6rq1qWcsT8ephmqo5IjLyVM3c61FeRTBRU8m6syNZhW+m0zUXMermBkOGFq2r7CZUDtKW6KmJA/z/qMf8T8J/5AsixGPON1Pw+l/hJJHdN0mLEtDOEd4EclLuRxxOBYTf92y6C+oyV5B8eHRRra3fPEPHcK/L07mIqNeJzY8cs72IZvw+DwYRbbDk9WJTs4jSrtK5/udc9d+nVaH8kcTyvOFYUQcEFW3a/v3T1/g7Cgomk9oEG4AxL1EJWQuQqBKi8mPGk2GERFcPR2vKKubxwoIbI0J7rLi9O7y/Yk61f2xx/oRRqqqeq2v4/Eh2oCQSChe7osuXSqYhmUyA44q3IA4SEdldQp9OWpRkpCSpZ2C/m30Dk4rwvzch0FtE88WMY2bZ6Y9dz00K78GmnkvEFbOVUU8Rd2Ms/h+hnOriItrDKBMRvNjGKNQmPkzAmUhkfMgI6KUiUghjom1I73u6/7GaBrve/Fvx4/+e+FwBic8MVPO29O6nZ0ATKCi5tSNlXgln3jmqyka61O7nuNCTcqIi4VuL6GVlev/8EdCMdCqaKExupb+qkEt0w9yhYvrn6pqyXv514DpkXUV85flwkshIqR1zQd9bNRGWKwrBTFUVR3gDqrj7CsEALMJpcceDkNiLKHUmc8arbZeuYZRWOZ47SFVUJmyCHkJ8DISVmMicCEHyDOFTbBfn2C9ch02u53TDwF9/d/PCYxmW1SD5H7FFCUud8mdDJz91nFQ/NX9KJ7dqzr6jNRXfV34oFBIaT6Gqqg6Yl54e6DKlM7Wd39sVixoVVUbyxqhYVQcohjZI0+kY100OTjuQTUWXUBUxGEZB8LALRHzR/ohEasMfoJnZV77Azxq++d9/0KvzjdsCwdzZiVjVOaqi1cIpICOlDOS8vlNDIgvSXVy4wtfE5wiR6G/b6a4IE56Mpy4wdH0fQthUFRwX/zZghLaKzInQFy5ESF0sYpaEuKrFFhxHGGuM8c4istm45p1H5FiYFgZljUN6UK8R0YrIqOH77LJ5vzpau+yet70Qyc46x3Lw4ERdxQpxI+ntMRtCBtnl2O4sxpQdnGN/aAEliOeKILaTuMEUY8R6iwg1R0REucBxJ+FVi2QaEQ+JMKUJmKYeEw7SGhWb7ys48bPKGj87Lxphc3pq94zPQCvQpWjCWNuqeTJsFvxuW9m838BJIkWpBTi392RVfLSdFEWN2651qaHpH4hukd9XP0dEL0REIxs86p4ljIUqxutTGIUKUXcK4egi0qo7RdSy+62PplVdfsHndUIUU5wy6KdsKWWquCBL3/roCfeSs28nILpLb2+Y7oIkoyCFkx5TCbtL3FE2xvfN73e0NpEet+yKZGXjvWv/1YXkjUNCNn4ZCOKviJtRFmb16SzfKxb/RKJfZLaE7yNOjP2kF4jz1mfLhFdXKX7B28SWDY5HXxWX0vPp/bN3++c3ut78Fe44/yCKECyk7KGW1cupXHhKKfpTISd4+Z6ImTV/V9Xyb8BJIkXpJBBCcKEQhXHBYKBUCIdIOjBCXccVkcl7tu1cZdm2yKrih9dtXVAHkjOX8OgLgyHtXVdko4jHStK1S3Yf0aTHlJrsnKI9e977x7mHbkd5k6+ORILXqwoX2S0IC1/P4YymhLIkHYdu9hx3LVC2TfhQpVbtQnq0l9c7TukcNpU9iRQHRVO22ankhW7lghMO6GxO8sPXvBwyzD07K5ffCieJ9JSOwaih3xgkdGdUOp0+DyMlXrZ/f9/igoLXRIeqwLHpeYX5hU9HY3Udk4l4wnZSa1/78Kn3QCLxiS97zzJu2IjAPAur+FtiyxHRgvD8QuIGd8SQAV49b020GtbAKRLqdLPwFa1X0pYCiOBNTiJ9vlu9IA2tjKoa74rYvhGDSI9EipLgkgFTFV03zhUZhNFZWdlRXdN6mwH9PFVX8lJJp9pKO885tjXDshOr0nXWcDNgPr+3bFfkudcfrACJ5GhwfS4m6D6iwh1wmCjh7LEGApFpcPk2aGY4chdwMLphVdlGk/YFTvW8VhckH+GHPpSM114Pp8AZI0qDB9wq7BrSBxN8Due0xHXdbOHxiHQ2iojdJbk5Wf8Rvk+F6MG7HKP5tfF4LSRQyvPYbDuV3rHmnUfZf0+17L//b9L8HsnpDbXdxSSE77McJ9voOHm4VTpv5YF9zKNFHiVAKdoNzUhW15ueEO7TaERY3E6mLnAq56WgjdhdvmRTcdZ1b8EpcEaI0lXn3WwKhuuB4NnJdOpi1/PnAaGfuq7TRRiBnwhPqKQ2Wp16+e2n5h9y2AsgkZwqnJYRRfNNZsjKCX/fKoWDogQeCwo/EqxUstlEKdLl1i8Ig+kORcPgpZ3L7Ip5bZ5pFdng17sXjAjsqHz2pMTxjBAlQyVF4gPyUsnYLuo599tpK+vNT+b7ZvT6/zbZCxJJM6KIBJlClPp5YIlE4upIh0lFsf3zy+t3UqsDQSKT5tpl0AyEOky9STWMB1OWBYVBY0XajncMFY7oLczwoOs5H1fVvbQubF709ayQPlE3zKh4U9y2rKKUxVfXJF7/kalccpmK6d8JFl1K7pkYiSMFjBm3J+gbp+yVIoQXe57nTxaWonQ4TGQqVr7x6M5DNsnsmKRZKQ5fpVDmXShS+g5VtG22Rga6rgeGaYAlxEJkZb8rmv1ffWNCu3pWAvIVZwbKGfbtWO1zCw6cJ2Je/Of87MAEEWYonuPkuraHHKz9pTr62o9yghc+rRA9XBl7fcyB9mb+pFuIiusn9mYRnnDKdo9k6eRIf+JsMBLYFY3xN0SzqQEV7jPVQK5LlX+7jvei56pIVVH9gEdDISlDV00E+liOWBwTlQk/7IFEtO4hoHARnCKldauq8wNXFMFJctpUnhw75HZ19JDPFA2/5OYjhvavem9Wq43PkLQ9ETIocvi2TjmXf7174VXX1u9Xzp6eq1947aH7i8OX/r538XVT/McdIxc/1iky+Ev+4zAMeKZjYMjgQ9vma5df2i13hHbgeefsqyd4bqKKIP4yQt4qBacr8nPMGf6w7O49u+4XgQdwFX/Ob6uFr+1gYOuXusjyU8ZzQir+fXboqnkHzmUS9GVVMQxFDb0NanA+U8yHMEaz6993IHCFitjonOxrh/vPs4smBFWT/M0VXUHE+B/Kdj4dFtFPWGSIt4ku4/IN2xd3K616vn6mvsfgo1TaiewsXfGlfVWr5pZH18wpr32xvvsozp/0GP+gNPrCtv11ayr2Va+qQgB3ivfXxUSX6tAEbNc9aaP9tIiUJlx1Z19CCJv3wqNbxNNykGQUnYOXaZZtjRQPDYzpWaqiBUVXQ6tlHzXIShUZF/1OZG1uJOLWzynFHsM4nrT0Lh063k1Z6opoNPE1ymC/43muy1ymGsEqEsx5iHG8va5m6Wv+Obrkj+haWbV/dffcawbsqHnhYDIiZGg/C2eZHwUDwz+M1sVvFSn5ScHAVZE9tS/VDz4NBJRbI5HgFReGRi9MpOITCNF6Bs1rFqTSqZGMuxd2jVxRsjv2afEyQvDZhqbuFA/Lzu4ypkNdtHZGOJz7d8z5L7dVPZ/Mybrm4Vh19PPIyIWqisQXwwHlibqYk51bcutdmlX9C08p7pTWgiKCsrvUVSxIYLjslwfeJ+V4zaY9K4cf7XNkGNUgrHTOUvh0o2TSgBRHz1gM5xdlh9/f8/HDfiQGNdGVic75175BqdugRpOmmWWIqD3Eww8PPy/GuFq8clan7KuEHlCFqCSMkPsbTVXVmPu6DU0g7r550t5Wu4+UJg+9+9KFLz2xSXyyW0HSYnQvuPrhszpdt2ZA9xuWD+w+avY5JTc83qfj9d/09/UsGnrH4e17FQ8fNLDr6Bz/McL01XAotMgwtH8bRvhLRNFvVzXzwsOPyQnnvpUVyX05EAjYwpHpEgrkPNmxsOhH6/cvWWroSn6Xrp3e6d2j66Aoe7dPrx69zsnKyd0qukpPuqr2alHXWx4ccPbdpqq4f+zX65yPsKL8+tBzE4UmDd0QvSk9SSENfmk13dD/c2C/opCEuIaqhJnChegkAPGAqpAqICIfC24hUtiSA23NkGEKQzlYf5wG/yosLNq8o3LV931B8rfVRl+4RwsEd2NOIFq26/W62tTP/FnzuQU5f0+5rHOn7n3SjCIRvfB6QWTw+n0Hzq3rRlWPDtfVR2HF2ZcpBVmXmQf2cU7iOQVFH0XysgwQKX8HtPM75UdAdZLvHPq3OrZXJk6aPHSbEKVdIYO/16vT9es65g/ZXJQ95J1OuVeN+vTEkEKMXWE7qV2Wa+21HavCTqc+q+nhv0Ab0O4ipZuHf+kScZfzJ4Ju54yF5qx6qL5fPO/5R06tNMZpRt+iUecIwzKWsut+GzQjKz7Zt/SpszvdcInlpT7HxLUpjM/CdMrtmLTZhxZ77/bGnhcj9VwR4fROJdI5mq6Crhg36UFl/af74IsX9R2/6N1Niw6OGo4EA8WiC9BbPJxuBDUVPPK5HXVvPnq819hYWe+tLDirYES3VCL5/m768g8P7FMV80MkUqavb5xTPzbsw+3zvb7dJv0smkjd4SkG1Dr2F0ryOvSt2L15oLg8+seT8QavpWraDs9lRUyAELIK8opfKN2/c2qfoqu/v7l8zX6ESdK23E0f71zh9e10TYVKNE3cspnwcFKRYIe/V9WVfl+I8NjNpauWhMN6PwzE9yW3WW76Qp2Q6Uf8MZqaa1AMNTvnVeqRkY+rkeAf9+7dE+paVAjhiG4KF1mY4dg3gRtEIoFgwEHMSnUruLoymbQ026G14eDg78eTb8xLuqw8B/NuLJzrVO2qyC3Mz4Ou+aGlez/ZNVYc+oUD53Ad523Xtbo0+P6E6W4GQq+u3bRg6OFvlXHKXc8tDxqBgb4E60b4WdeJXcm5pUEb0K5E6bOTvv1lgkndw3N/9/Z/N8WhnXFW8WiNcV4oMhxZG8uWfeJvO6fjiGs/Ln12da/ioa/qumKKrM12kSDhoo/Ss64uHurSoejcaKL24ZxQ3t/f3LLg3QPnGjboc12qorU/f3/j/Lt7Flz/cH5u0WvV0Yo/Y4RzdT0k0tGkp2j2lG6SXxs4tx+l8ITjOUFd9f6ThfCr2/c3/n1vq1g1yP//xX3G/NLQI0Ne+WjGnAP7IpGwrauKemh7TSeXY47quzuaZrgcQSk0ko2Vz+7MRhc0+LEqxC8LZA8e1H1M4K0dS1P9ioeWxBMVDykoJCIbDXHGYeOOsqEa0aq2lz9bURy5Ym6H0GW/2Z94/b9ldJUKQEqYMxsFzKxKx0n9IxjMelP4Mc/06zziUvHuN3rep0PRLMt9F5n6JQpWievRWo7Qsuycwh5A7cevOPf2CzDxOieTzkTRdDqjOMWAfHTwszAu/ZlpkM+mq0pDihaoz+rasRUxpI97T4Rrg6LROBjRpMi8iQQ+5kdME8FCPQjOvt5j9jugYb8QbTqefKn+jTlI31we8yb6b7MgK9cLujHFiQeqLCsVOPQcHnOFmKVKGpwXsa6JlHPUmwIDD1HP1ffHXq33f4rwlVcLE+xlzlNfCOALH0ux945ZrK4lyBhRmnjtl4ILVv8refPobxbOWvaXBiOl77nph70ioZAq7MLyaDTWJrV6zu02ofcHOxduOXTbteffdf3qtY+vOvD8ugvu+HFNLDpJ/EghEUtY+XnZlz371uPchHPeCarhHmZQNxzPVZJJ1xG2yeZBvSYOcW33sr0VNU9dc+6tvZKOK65bVOS4zgWOzSEUMl4xzcjHb2+ZZ53bY/gQohHfsP/cgdcTff+bFayP8x9vq1x1z7ZKgOGXfr6X49IpL773WN+DbxRBFvO8763bvqRJ9Xp8IuFQTFywDTIqQVPd41F69yV9x73menZHkQvuZluxb2ta8EV/v8iNI6LjJy7qO+Y1cVvOr43Fe2Guzd5Sseqbx3whIpwF739PRXTD95fV9k2kYvvyyQVQU5fMDmTlQEFhh6t3xpNrUpboZFEbEE3kZoeG/EIPqkOTUeuSrlmX/WJ39PW08KJKKWe9CVEUkY4t9KgT2VHxwi+7FQy9WzPUZZjgHYyzgf5rUY7Wu553CVY1f25oneW6gR1ly27q2eGG19KOtU74TyJf7m3324ouWNSjySHi4Uz/uaqHntUi+lQ7WgtOtDJ44P0z2/uDFgrOq0vGId+faQt+KVr34NzT4uxrw2V1q+Nioya+15e371p+hGCZIX1Q3EOguuktyVRqkPisH4pXrfcLqUFh8GpckVxTL17ipsctlwUPPdYTbzho8q/17DJqlu2kA355SMdJX1hR98bLtal3rCAeqBWELsupTLxeW173Mo8Yl10n1Opll1n+zediaEUyRpQUTel9143fmWoEzOAXb/vJNvGt14qoaH06nRwj+tkrXMrKHMd7nzJ8RA2fQf3G9Htrw9INh24bMnBi59c+XHDE+KNze4xYIAw/oRd5v3ZcrygUCkxf8erD7Gjv6ZoL73qiZ7fOXy8vq+n8wmsvreqTf/0vN1etOlh7+aMNm/9x28j/u2b6ij+VDrvkMyvyC/OLhgy5+E7xPu0t27b/et/+6uWi2Q3XDxlyuUgP96eY/am8vPbc/Oysnm9vnVNXKizAy3pNzA9FDOOFD2b4Yzku98879ILbfugZuN8r6548WGqiuKhgB6daQYPPTFVqwpHgnkO3mYHAy8R1zjt0G6VOCCE1C5oBXQuuZRxNanB+xIvL99feml+Q+5EvWAiDUiuigaLCrHqzlYD6XDKe+mF2Vo74PWJDhGofCINkyfFeR2iSfl73yQXrdsyr9J8L07XONHW7pENP8Vnaqepkahal6UsU5KVyA9qKlO2NpFYNMOEUI5S+L5GiQrQVcAD53tK3MIY8Rr1OwkhShK2kWx74ntYcyvlnqytqVucIbwYj/b8DZnGlY9vGtrJVTsesKyzb43n+Vo61seVl+6sQIhAOR+rrJDkUv0btxL3i4Vf859XR599U8ybWOLoJ2EobB/4eJ7Z8vh66MYkNM7hnt39ZUnGvYP53Ei/IHvprESH5f+dfkeieiWvdj8Ia1CPP6nTjH22sDjU1r8pJpgYmKhZZ4ciIm8DxuirM6YdJ4OB4IPEZ703E0g0izXjc3cBt5zNY4bXI80KMe5xwhnKDFz1Sk3z3HmFybdU5OmiBxKzXbQUuGuGB9XeA8wnAWgqtRMaIkqYpOZGcrCG6gQuFf7AhmUjEFTBKFawsEt7jJ/948sdHndZxeb+JvTftLPXvyMWHbq+urZ1/3cV33Pn8O9MaiJUQh7N7dez+QyOgrRVZh0qRsrxo6CV3XP/i29PuP9Dmy7f9SlVBYa+89ebg7MhZHYOm2WH99oIO8Wj8BzcM+vyCvIK8pK5o3po33gqJBEXXeyfdV75u/QfduvfsuUEYmor4wtMdiwvuME2j9xuig7bktYf8C2Tt5Ou/8c2yyqqZviAdeC2EEdVUpUG1BtHVIeJH1ECAxJ1N2B561aGbUonUPtthDZIVousmgrCGVoBIEVfW1qQe6Nfxul8pWFNSyaSHdf0/W8qe+y4chf5dR5nrdy8/aiqXCicYIa3BdyGMVeH1Fvz0jfVzf3Fg29ALb32OudDVfywExs2J5D729qa5n4VGoimq+CGggz8ETEhdTlZk9+tbF37y302DOkYGl9VW7F2T07HP7aW8aiTDCgQLSiDhEcjrmAdmqiJdvmffV3oUXvcbhLFZWxPN7dCpA0EKsoQPVO+t7Kla80JxztW/ramOf98wvPoZ+8J1KvU8/qlRrGgpD6OiooLRaPu+RdUdC0Y+gpzU55OJ2MDePSaromv3g6SdujsrMPhd8frfpBgn44nYpdhKguU2LIKXsKwnTUP9YjKVAOa5YOZH/pDbcWRxtCqRX+m8OMBv4zF1Y6q2fI7IoO1OpRPCj8d5OJQTdQ29k6kZXqKyammqalH95x+PPcsNY9i1cccVn/uagwMU0/Sdl1U8qIHRX5N48Te2csV6cSOr5EjlGKs2cJpDMK/3ZBl8cnlNsuF34MG7fpG2VqnBdCgZk31L2YlRCOH3MdJeSCYTQvXJ+kQqGbJduvVfM35yzHlmVtoOiJRKg3Epwy6+1V/zJQ9xnHvE6yRTjq6RF1VFSQdFVJYVCtelU6kGJULFrdYgGJmAWCQYMs8WnsxZTITcffv3DlTFEi+Fw4GwZuiBYJBUCd+0UmSoWciMPP/ue+8PL6+quFF0ZVKu68JTS3+/9tDzUk67iTtig7BaUbStQoAaCAATfQ0GNKdBO2IkKfUaCG86md5SUVaW17CdWm3ZqV4NtiF9bccOBW+Ew6HrjIA+Kic/55pwwPjtYR8N9O44/I6S3EutVKwudU7J6FFwFEQUWJlKJRt8rh61TSCsga+h6YrjMdbt+gtuFc4MNoRJnQ8ngeiuGR7zDo4Pcjwvuy6W7HRoG0ICP/G/f42lfh2iNeIgAgUl3UETQUN1rQNqVsnfxAepij7xn0VQUGTbDiQT6SBlZC2lSuJ/n5nyI9vzNsUS6fqojFKyribh1HtgPBiybFX5q8jb14/pKa1ccY/DlTctj4OFYYOtmPdqBV0+Gwpp3VWwXmJO7C2eqBNCTV4katagQ9+v6FPd74ciRERRRDPE94In1KbgYzDMg7PpY2n+RUvNuS6BQjfRSKevZfc4e6cXLugkop/16bq4IQTp7kPPaVnPCSl56/8O//xc9taiw7clvVcWR9Mvvh5LrXmjLrHm/brkK6ur468mIcPImEipqrr2upysvC/GxW2YYNUA7m1/eObPt5zouETSSohQ2z2v5w1o3bZn6sNPRZgEItR3HY93Orx9MpkMJ9LuiKJIaKWi6qQ6Wv4zwzAajN0Q0QAWdoaXtpM6VtC5iq7UBoMB6FPSa8SLb7z2QllN5exOBZ2nMkaJ8H+Macv+yu8a/Z1vBhMB5513P/qikLUvhkP6O+Ou/PwXF7/8yP/+BoI0z6Whw96SGU3EGgiVK1xHO2X3aLDN8TTxwzIP3SYEFiXi8QaD2xjzehJ/Aa4G26BafERL39m06H04DltKV07r03EUEd2KvR/vWvbc0dqkLVuLJ+IdD93mOV6RHtEHHLqNul5C+Gr6a7uXskt6jQHbTY89p8uwVzFgW7w/f0UeGxia+cG+5dOP9joi87QtnE0PinDK8WoqK6MNzPI9tasf7pw7bOi+vXuHiy+sjugse//+SujRqyt8+MEWETFlZ6FQ0U9SrlXKEuivSAtevW7rol09ioffzcE72GXfW/U8K8i67hyREau/uZXHn68zA9fd7onYwwHSwxHp+2AwuOXAr5fpkStIQK2tSvKejEb/Vlxc9M2cwvMHmPHqf9ql1RNEoFvrVC+95og/KvXsXjc0cZOiKH25+IY8NWtVrG7BVw9tUlG5xI94VvuPIyU33VCTcs/hFO+mdvqi1P7ZrdaFaksyRpSoJ66xmtoPiCLyJ4rmzlj6x0bNwqeUVonuSYQytKN/yfUiJIXA/srSUHV1MlsvdvwfypxD24ezguqe/WWP6UF9hReLDti0fnvPwuL8BrOZhSgg4Qtyf94Ow7x/KBSaEQqFk3pArR500Xm/fPOt938fHpw1VlFIoYivc+8a+52Ax6jbqbjDr0q6dv676H8F9+7df8OLL7/87pXn3DT85Y9nfxoiMy9C/OpwhyB+GZ2FBRO5uPu47Hd2LK7v1lHmllhOw8Fvdtr7JG3bDcYDWZbdR4T3DT4PhJXK2lgs0vDvcYQRi/ueUzJymuPY1RijbJFdDwj7ec/He1d6h7bdXLr8MTgO4jWzKiurGwirR1GpbUEDX048/4spQsz617fQnLTlTEBIKVBEpky8Z/E9OR+KH+8xS3dk5Rdcs2nfkoNzw9ZunbuqV6cJ/eoOq3i9t+a5g2uLhTtP2R1LuF3Sabd+ccT95eW3RMsWHfo51s/j2l62cuPhr1cZfd7/HGoOPE+nnq/T8yYOTlOlJxV/mpWgB1flqK5c6JkFE+8Vv54ZfnS2f3/5X5Jh7X4r5ZlEC4PjomOuTOIl7W8pEW25v46J5dgDjtUup+dtE8QddoHIoG6ybWugte/MmZWQMaIkEgazFqz690mXWvCvcH9uo182NGSG/xYwjX2hSKRfLLbpN6qGzzq8PSHIOfusHnfmF+S8mp2b1bl3z65XL1j0zM9uuPzekmdefWiX30Z0vagIralhmqpNrS7+wn+7du0M9u7ZHYKhwMOhLO3zb7z19r9E/1xEAPZAQvS3N27buKhH994P5uXnbEDI0w1DmxvJMf5QE43fCf8tqi6iqmyi4AbjqRzXzRWpenA9Xgj/nZNHPad3Mp5s8N2k0u70ipqab/XvOOrp9aXLbxnYcVRR3E39KRDMXg6H5COjifj5actroFTxlFPnWE43YfTuE13AJMaMIIaFdRfw60f/DE6CdTsWv9ircORPKw65ZWhK8DrXthvMJ3zloxm+0N/oP167d4kfofWFk2B31cojJqtu3bfQO94xrs3/hlX6xz2794sumebfXJpm7mvqnR7HENAUq2730w2M+XTlgqeDncdP5yL8FQ44pNNg+ovOelx/2qqa9vAxz5lc/gwLTtwnbh6d3LTTMVRwI0lUzm0QAeX3uH00xX5dJK0snbTOdvY9fUZESAfIGFES3ZrX4BQQP/JebtyNBwq0fm9v/LTC3vhrv7TKDOBfR7ICXe+e9EPddy6pJ7od8XR6/db1uu2le6h60QeBoJlvmOo+4QeIbFHcT63/3T8+nU6LLgbhju0mo7WJ6hSyNKEkPJ2yLOYxp3OHbkPXVby9maX1QG0scfbCFx6wuxddMaDugw+WDhjQ+2nT0NfXpSvvdP3xuiYcHOORiKesaDzRoLtlpZ3tfldCmPndxNPN/jbmKm8IN7ZB1b53ts1e2z3v2mXReGxqvnbJ9RU1tRQRbXsoCF9q8IFw7S+hcF6DzAvCoa/akPjI4ygm0t1JqB8ig5zaqjXT4RTYWrHid4c+/2DH4oyosmBVzv2TXjzuxx4l2f4SP4STJpWAdd30xZouetaqsebwfZGCSRrzl5n1b4bZHX5rpZK6Y8N8u3LaCa9jjynzNIK+Lvqwwig3/HT7mwf2FfS5dywFa7H4zjZ6KWfgmSZIPhkjSm9/snAnnAKapvbVRZ6XEKWDeFo/doSLn7jI2tmhsNFJeEFdyirLfq4pSrmm678VWRhdeCJficbruoieBNmzd/t1sSilxYVa/cCyy8+/6e7Zz/y1vgvTJefy8tJ9NU8IU3xlMuGVxhOJ2rmv/cePEfad1WX4fbW1sfurq2P1GTEFB36cTKYfeeft9beIblp9BkEY7W99vOeZ//2AKZph23aDpYw/2Lvk+R55w777UenSgx7O2u2L7zu769gjCmTtqF49plv28BLNDKZ2RJ+tN2XhMJvyuTf+5l/E/zh029Z9i/y2v4YzANdTXkOEjfKXqRYZu03QNLozzgCr+hGiyxG+mjOR7QsZ5dWb//UDOAlY2nsIKfjrfn9XJEPHw39FKb/X566i2FkAYGyyU87Zyd3TjjpU5XSn3U/I1TU9odgpLFL0B32UxS8+ZJ/d7bqoSCLVRvRU3YcfbZ1Q3KFrVViDn8XrnNim+N4uW7ZUfIEQlYcj4f2F+cWfX/3WE/U/72TKPRjyFxR2+NGi5/9ZP4P7gr43fv7ZTwWpno17Vv65V8dRL3y0Y+E6//mW/Suf7Jp3zXTbZXcqRO8oDN239tSuWXXoe31l3Qy/i3P54X/D9urn/nT4tk92L1kGR2Fn3cpdcApk590wXKQEb1U4fCcVX3XaTlpmFv0nE6IkUphAMVkOp0r25AJMvE+vKU6OKMZGVDTOX3RE3H9O/jWSCzZY6ujtmqb3QNi9tdt5X/1TPBm/iSL+F9dT3xJ9+iuTux9vPUEyhk/2JweKruVCyADavSgJ3/gjDMZbL3349LpDt+dlF3wDMbbqkXn311xz4V2XMWrby16b5s9Y7j6gZGIHhLD24c55u+CwKttrNy04OAnx/U1z5x3yeMXhr721dHmD19xd/YJ/IR3XKG4rHIK+SsyiUU467Xtad8DpiqrU+ZGqMNH9Z6desljRhoksMPbX+8GEHeGH2W7qekR0sG3+JJwCnGnPiO7fVyzb7qyY2jw3wa+klKxxU6nrnbLprddl00acq+dl/cvxnBBXxp8F0UXNWqL3VJBLLJ0hBIom/o4S7bt2Ml0K0cWd4DRFLxi/EbBIuSM/qaG/mN4345pTOY9Zcsds5rlT/OXViKokEzuePJhxRFnje+om3yLyH+9Y++cNglMhPOVKLYxe8ifAKqopMq7af5w9//k8tAXZo8qRphiiOzoOquavgTbmtCnyJjk+DiUf+EMygeBcCI/vAKchRvGUZYoR6FtQmJc0NB04tS6D8IRT6g0wbovzFKb8kiOu5Qb1jp+pX/KaFE4OYBUWCqMJrCT7PpwiKKC/qxAVVCFIHjPvazNB8mEsrSgKESHKQMgApCidIXiOu8OjPE38i4/op7T0TSajFE1eQ4g2ChO1JuXQ7h7iK4VPooOqfRtOlpxJ3QmonZIOHSp+Ii8h7He37G8HOk3eg6i1W9PwAMvmT0NswYtwihCCnxAhWNyyjc+4ex76FbQpTKfUw6JPmhF2jhSlM4XYoje449apqqYSTb8BTiNQzvh5Iuq4inp2mZdKDajZ9J/KdMr9sT+jUFHpl+Ek0Q31XlVX1dpP/vG24/IRVtp9XxEnowx11s1gns3UJVA9/zY4BQId785VO31mjTDKr3WS8CVW9vApDctoNsxRw7CqZTHLEZmBQ1ZcaUOkKLUWoRELIHBtHELXRyFrzHtKZOJ4aG04jdcXzeDuKReDzzgiYxfpgcAkymCfSLedk66Y++mctcq576bS6Q0ahs6QM/Xakzmlritjhc/zvP+Ylj1tQc28C1Mxb5TtqF9PJnk/VjZ7HJwCka735lNM38XY7MIS6Fyv8vG2FSQfhfTDimKAp86F5JJPIAOQotQK4NCIX4SCgQmaEQxh0aNQNKWPGtan64U3vWrkTB4NrQVRohj7Y+C9LmBOaP9md2DUdC1ojvM82Mgd7xyranaDWfmMqf/gou9FNPSbxp5S73RnFidqn1Rd4pEGO2Lzn4Hqp/8OtXM2wikQ7nrPeZzQdxlSarlNL3KrH8+MZb0wXMu4FhUf1j2QIUhRagW4ikc7Ik3tcO1mVrcsi9twtRVPvS7E4TJswgKIjGuVYQTCc0n5U2NUBWniySnd7TMG44ZntUhoiuPgj5jjXuTVzD1y2aza+Q/atrUNuem+EJjcqFU5POpdzhmvTpdOa7auTKTbvVcghb7gMmWdu+fRC52KR2shU8D8PMTZBkgv8yBDkKLUCmBMSlyXl0HtvPqlcmhs4Xs8tniYE7d+ZSUSthlU74LcyXOghcEKqTMME5CiAja1MdAeidx4EQRHfqjnhIc6Nl8tHPwLWe3cY5bfYKDOVU0tIpT4a405PUJ0GEHKm9BMREruvYQr7lyKAq9bu/7dMl129caTmld4kNCYQcIjyyHKkdNo2hIpSi1MqODm8w09kEs044iK2DS5/CeYkvHpyvIKVXUnQvbEh6EFIQgnc7KyQcU6YIJOafxOm5Jz4x+J5r5mZGX1txNsmehKjYTofPd4h4jo8M8UYY8Y6KuNeQkOrK9js3egGcjudu+5FFmLHIusTm77R8t00/UbvwGG8xrAiJMexIkM9TZVN0KA0SuQQUhRamGEsdyD19cyUI46UNVLLl+tB7Mnu7EaC3BqEoTGXwUtBGKsTFUYdO+cDQQzDbKmnNodtpUxCm4pMYqmvh0I4P/TNZPYrv5HiM+d1JhjacXMSsf2lmsa6QJ5nznhSHbquSWux56HJhLufu8UT7FXIQgttvc+ciu0FCrZ7henAUKvhuBNxskcqhAYS6lX4+x7cgVkEFKUWhghSprfiaDs2Dd0O7r0FUind2Bmq6Cgn0KLvRle47oWFBZE3sd+GTvujYAMJ1h822DbS76JNfVil6JKy1VH8cppJzdoEWlfp56IV1Tn/uO2C0/oQLRAmGNoUhYqt+cX/g8p7mzuBacndj7wRWhJErOWQDId88NgQLxjo4/LGXOdquEOdjLxIGQYUpRaGoQd5EsTRydYQ+vdAczV5gHyBkBoQmdoATDg0rpYQmTOg4+BL5LIGwYZTFanqRMpSq8OhiPFlKNdGOkXsMonT96Arpixy7GcVQpGHSHnlpuO2Q7ziUYoYtP9T5zy0l15fb/4W6669yOI/Cq584FvQWvA+GJwnOcgMWd7o49B7te4R22Fst9BhiFFqYURJvdexIlfd5ucqG1WVu5XwbNFbw9NhRaAM7rPtikkU+IHSuqnuJ8LGYqRO+qJtJOYDxybQkxS4u0OsPdPO/U0Ole/L74EW9Hoj4/VhATwEPEhfQinSMFZX/4zQ/A91w5OjW75633Qaqz5tvh3d6Obh8b2DRiRG0RU+J5TtyTj1k6UotTieO9ZnpvkzIucqGW0dGYSqXql+FZGQgvAKd3v2E4qmYhVG6b+iWYYRRAZ3x0yjEjRhN+IjNkdiKjgryQbCJp7U3umNe3HUzd3vZ20XtIxOwfn3XLUFToUol1oJZJvwCmQ3/feRyjmn/M8/e7Ejr8vgAxGxOw/E1EhcdJeKwpn45Gi1MIkymZ6XjJRKu7SppIz6YTCpKtGtfB+8qAFYIynHceJJ+rqUgCBBVjRFFDNRhnGrYmiqtWcI49z7i+9BTXRWJ9gl9ubLtRK4AvC2LVVjf7paLsxUoto2jmpTFRxv68EC/p9YZHL8VjXQlfFt/71cchgcP6NnXSNTHAd9ppTMTujsm4HkKLUGnD2vKqC4Xl0womaqkSpE7+Ok8qiNBbhhe6jfk3/VJJS15uDEBOWF78cMoyavXP+qBFcEg4Gsgghr9d7uET5GzSV2tk7LIeuIMALIGdKg2hJKbw91xMfigjN1jb2dDm9773aBXu9g5QLuMfOjm9/oNHHthUcnL8jRdE8h38BMhQpSq2AYYb+hrCKRMjcmPIUCB2yCGOz4i/tyv0VpFioZseTH9t2Yh+34hlRruJwavbMK63ePiOGEQx33VQtpbS30fnuUdBUuP5DKhxe3cA/OXQzw2icrpgKxOY2qjBcTp97L+WKt8D2oIqnrJ6x7Q9VQaZjDDubIO9a1/GW8boFH0OGIkWpFbBqFm5yXGeP+LQvQKHRweO1RQjpwhxvEVFCmBCMkCq6h/XL9ahEi4k0chaEJmZsBdK6nU8nVEXdA9QBrKhNH8MVnbvBtuAZTFAvVHDr1w9sNgx1sKIH1zfmFFm97x1BCDyvoMAbiS2PXBjb+R8X2gMKfUB8/9hz4DuQwUhRai0YWmwa2OSK+pXjN0T+0tsts2opQhEk+kPivdRnAlXNeAkTLkQK9YcMRtX0KqGnIPyg5hFPpN7oeSyq6/x7Bza5zOnouvSFEx0a6XXP10WUtQgR85mq9f9oeuR2LPTxOmhjhN93xTsAQ/8MTSU86t5AduRKhsznoW5hUxdUaFGkKLUShqY9yjwnDdy+8XjtRN9KEd23GLQAIgrzb5TUX4qjfgNT1yqqoQMhrb5e/MnAGEXMr7nCcfMseFA723Yt92mMUQfoeGv938651yWVct4+3mHhnvd8XzPh94yrD1d+/Ncp0FIoI78KKLEJgvwBCEU6gBpeB01Fcb+VttJlXiLdIsNNmhMpSq2EVbVgg23b+4F5XVFk/DFrozuOlSPkowZaACFIXMRhjDNU333TMFngODQtfpKDIYOhHu0oRAM8134WmgtOvu56bjRswINFF3z7MsR5F+6m3z1W81Cve3+jGfg+zzN/UfXx3xs1ufeUUck9OBAMQBreAqpeAu6SU1qc4CCB4Q9qerArd8zvQnKZDRmOFKVWBCuh53TDLOBAjlm10KNOAaVsG7QECAxGXY2yTxfprdn7hG/OiovUOwtaG+2aPqAN3QHG0A9Jzij1WM3yut6scer0EOZ8LS1/8gNoLqJzXdclDzg2CzI7ulLFuga1T5cerWmg5+dnEA2+nEzzu+o2/K0V1s9TpzAL3wXWsnGQXlQKTSE87hY9aHyGOuoaiC1s+6JyjUCKUisiMvBPCj1wiYKP2l0y8iZ2Q0gJi+7Kqa9XdhyEFBWKLovrj1c6uJEKA1716yuNat1rAfFfGnkF3YxIzgDFMBeS7NFHrXdEuPN7cZmqiCvzobmpnPkjhlhFdXUsJIT6yMGZ+beqeo/PPUt07eJk3LvG2v5Qi5eXqSe9cAOkFjbLNYBV/lMPqQmatluuu9nMSFFqRWjdojfcdLqcuqmjTu8QJvRdWCGEg9d8EcEhCFEq5oyhaPnTBxc6VNTQ+5qKg0CUodCKaKHIYiZCN058z52PIhp+g+RPuPTQNp3O+uzohEu/7mGeonaqRbpMboL/TPz9wrdyGi7+WHCLQYJklaoahelo8lxvz6PvQnsjPHqarundmY2+B+nFGTed5FhIUWplkKK/QVQkLvgxR9TJxgoMZhxVizC7RbJvCOMsjJUGGSzRbVmI/dm5ujoEWhEEXi+CCYRDAVfD9Wu0na+p6I2C3rfu7Hbu3Wt7XvDZbfFUbCnWg8Bs5Wte3aI0tATUe4y5LhMRY0comjqgflv+lM44oD2rkEBlYtM/L/D2PdEyr92C4IIpXzci+u2W48zn0bnToB0hRamVIdiYoWhqiATDtxy+z/HSF2GivAotBYKAL00NN7KXHI8mRD/pUmhFFJUMxtwVvTjUhXLlBsq8jZiokEi7JZVVqfP2lSZ6eJzYrkd+6lXNeRRaCkqxv94RJxhCIW0Z6nTbMBI0l2CsrbW3//tGaIfg3MlnK9i6305bW5HHb4F2Rrtftru9oRC83PHAFVGRv8zRwdIWuR2nXmxxJ5xKWsugheCc5oh/DQb6patmpiB8gwjtWS9oJfS80d0RKNcRRdlSufUJP83vFxlb4WaPzcVEG4wIFAjxrGBJewWrmcWhRUEDdS0AoXAAyivKu4bCOcviSfZDKH34j9AOIfk3dkA8/Yy40hIqMa52aua08OfX/EhRamWsqtkeyp2wm1O7h15wS5Fd+XT92BuiwFd5mhOw7aXQQjDudlGIEj9i+DFS3gJMhoE+KQj2/JYZuHkIHMOXhZekcMCLG2yvW1JDAVrE5D8mhjoqHAn5URJUVPjVXMQto3RauxQknDOZMJZ+SdfVAstRxkH1nH3QDpHdtzaAczxNIUhFCjlYntXxUldSyjaBvTIBLQWHToqqHmUAorFa/BwV4bS3itlNVOU6hISdb9ttXvWQqGxIImlBXdxJB0PhOuq6JhTeeju0M0jujZoQpHdUVelkueqPoXruKminSFFqA1SMH6eek1aQc5f/vLjvXed7XClxXPQAtCQINIz4EXdPjMkcYMgGQ7kZWhicM6IveF5/SvlzqfJ5ja+U2BLkTe0vzPZrOEdlNZXRwfG43c1zkrWaSu+HlsQcXwjNDGX2q5qu9nGp8WeomtP0aSltiBSlNsCtnlvqMVTlefZZ/S//XolCrH854jYH8YX/hBaEAw/jo4wWZ3Uzo+J/HlC7xQu+Mc+uF14rmW56KZImoBXf3jsc0F70x0mkkvZnvP1PfsDLn456rvJHBbFOpPiOlhm1HZhwLSD3Q8DXvYtypwagiZDsG/tCcNiHuqEPcDzjJ7xqVkYWbjsZpCi1ERiprzDQIBTUVlfXupd6HmnxFSU86nR1Pbr1qDsR2gte+uREybh+KARHdmhsc5Q1orNuhq/i2NjNY888A21EoOtdoyK52stYx4WqpgItm/a/1Utq59/vul65iq0fQEuAcBc1ZGarBeELRXzzb2gCOHvSdRQlX1HMUHfX0/4Pama16wjpAFKU2gjm0KVc+Cpbtu7pyQkCnkr/HFoYf6knzugxZoijVaBjA+DaXGgMkTGfU3MiK4HAJ+Jx4+bOYf4tFRNi297foY0Idbv7zpzC4JKCwsIc8X6AaMYRXUiXkj8g0avWut7V/IX/k/OfcC0+B2HNUQm9GSKTfwUnCc6aHIHwmEcwduYpJFSDwLiWVc34F5wmSFFqKzxnEfU8N5mIguvQjZBe3riC9crI20EbOQ/gctH+mhcBj2jUrO9Ah1uFkY11oF7FURtQ/i5WFSFK5MpGnA6wQu8iCKlGMJCDDXzC6RdG4ThsqOrnHc+r4bWL2kSUwt3u+H52TvARQw2utCw21LXTgCg/co23qrl/YoiVYy/5O5x3U/NnqGPzb3dS9nzhslMtqPwAgqOeh8jYfic6DGVPDoJ5w984Sm/TTO1WUENvY8bOdauefhtOI+SQgLYivdxiyogUID0LK6H5J6zqljXxm8CsryqG2kmk9QlnGscYK5blXshjI3sAW3HciaKc8+5E1YFb1tHTxIxuQQxR0JWBYMOi451LzR4lXhkPULC/oh0Bk2id7aKb/umVzz5mrShFU2cwpoacROoX0AaEe975WFZO1mespP2bvWt/95NI9zuuIuLyZ+nUUbvNHkU/Mwl/kOvan2yAr0NzE110i4Mnf0O80jdJyBjEPPoGzxn7kfgengUqblIcNvprYAEhJeJTHgQKvhoR73xdC5oug48dy/05xGa22Ji2tkSKUlsRGXORrmpZHPujhvjxv4fIDR8YOh+ISBDSaW83ZcZ/xIW6DVzra5pmDLLN1NcgCScQJRb2XOo6lfOPXpOI04+pp1igGxfACYpbcIyuVjQ9nF3Y4Vnx603VVddMVInzZS9/8lKomnfEumyBjpPupC692eVsHcSe+QO0IqjwZqIHyAozFLgiGbW+WLvlof/425nrTEBCUpGbPmo5FFo259+808Qfqcj5XIuIkk/tvL9q2WP+7jjwG6Kotyk6uYQAuxxhJhICnr9wAld1Q2UcAQVsMwabPdu9n1bNnQWnMVKU2ghFVR7i9YX7NX9Qo7/O/BGrvqp5E1XOvVcUXR0oungpasOfIbrwvkOG6D7tZY9cpxp6P9cZcQW4zx5zdQrXc8/CGi5nx2qQXs4B31ANRDkHToAeMCf7EVJFdfSviLkvAHXXEYL7m6qzLJ0/8bNQteBg/Z9A8fhrOPX+JU6e9Dz4HLQiQpCErx6YZwTNjqmoNSqx89GDlSUVFZeIyNCqrV5yzJrcHGtfF1HLfLPzrdPTe2fcBi2AU7fU/0q+JyLl7+GCCecS3bhSmO+9OSHiu+eOiJii3BWfsee941QtbvGBrZmAFKU2AGePfQhhdEH3Pj2X1lVXjKmpTZyNQqMJTyxr2IvDfJ2pm/3TtlsnopgJEJ275vBzIUxWacQ719XIZeDCMUWJcTqIIP34AzMx2ia0ZgiYY3VILzlmvESpPRxh03V2fbpaLS6cPJh73luKqp4VUGEa7zD5bpHN+6emoMusVOpepOjM8uhUqFn8HrQSqOjmznpAXaQHAoobS9yQ2PnE7kP3W7bVP2AGdx3vHKk9sxbkdp+6xbbSt5Lcyd+mNfPKoAVxKxd+IOLmD1JwZiON7lYmWHjjIEVD9zDOP6itrBlvWfYrSHwNSNGuPdDGzJ9oBDvdtEjTlP62Q2Oeo4yB6Lw19Tv1EQ3WjkOI7BFRCAiv6bhZM64qF6pK4PjlZIlahTHogMgx16TP6nijRrDSWVXVg0X2WcW8mAf4ApehVRgpoCByFeZsrkvhmx7oMdvjI6FqUYtNnzkcteNtHcyAOtcwgrpVG70tfpgg1YPVYkz0d050LsrI7/yspWGqLTcpWNIAKUqtDGX2XMZJSmR9JlRsfpRZCfowF46BYmhjDrZBcJ5H7bFM4KThGxCd87/KAfazDep3E4yEiNSXuj2+E4SUjnbKev+4bVz6KlaQOBu+7FhNCCFdhChpBEGDc7GqBWm3fN6wZNq+3Kb0Mcfx5qbTzm85tbvxqgWttuih2unWc/Sg+qpiBBN2PHFteu9TRy4lFBnXX3SLjFTSmnui80V3TX9U2Do1Ijq8Idhh6gkzZJKmI7tvrYhRMG6GEIcu4Cpf9Wpn7/C32VVzp+Pc0Q+KfPnBeWfUs/+oawGUStKHID7/uCuuEgVKOMPg2t7e47449Qxms63HbcPgWc+2a7EeuYylYMbRmmBErmHUA267bx5tv0j3v+YAvHbwObQegW53DcfEfZQx/JZdG73JLZvpHb2lN9b3azA/8eolPgjId0TC81FNwXOFqXNCzy3TCJuD+zPudVMweTuaerOq4b5LRuu6GhE3xhD1aI3IAn4cs97fCG2IFKVWQssffxtH/BbXY0tZ7ewG00mQor6HuHeF2XlKAfdYZ5EVGpJKWeXgwFdOeGIEfT3/l3+85YGyx/dRCNE8RI8/1yy9dA/gkTY2Wf9jGeJEwYM4xcAd5y3IICI97/6upqEfOjxrVWLjA8etg4RVfA0hKJrY83SjJj/X7JjxWH7PKd9JpvHZuV0+M7Vmz1MzoZXoV3IDSiTi14tkXDeOWUd/4QeRtEhVxd/9Y27g4lEE8e9gjLO4+FK4yNKJrjxnSH2gJvHaIwWhS00qEhEqopcihFzKHJ4fvmi5OHaif+5OeUNmMse9OWgoFkKG57hpZtleBPOBv62zP2yZEe2NQIpSK6DkjAmJX/G/PKZExY/5iB8MovC86DRdVdCh8AduuubqaJ0tumP6Mp6ad8LhS45LzxXJ4zRYy48ZBSEVD8Iq8QB5m090PvHCCUatHsfazTDu6omLHxynUQs3tgbZve58jGhknO0pD8Q3P/CjE7VXCBqoq1B9IkO5R/FwQ3h/sLP8OSuI1RvTyP1IZMce7dB50uz9e+ezcGDISENFw1RVSQo1+Glp9Zr676tb8fBcSq0HsiIh4tipAYho6x0Kv92xd2W9h9Ux/9KnTC14IcY84Npukeu6dWY46/ate1bWz+y/4KxJF3mue/aH25ZMs6zoHNe2J2PRPSegYr9Lzz38YcecIQ+7jtcZc8jGgMPi+ulhmJHZlPM4A/puTcKPat0XzUBQoYxeKA7bIZzHrwhD8J7enYY+IXybu4yQoYttm5NW+qLNu56PlxRfqRpEn+E4cf9mKEXpdAVFRvhp/XWI6BrY7FqeWH6E90M4nYYw/FJF8M3quAOu+CHwlL3yROcmueN14SUVcO4eVyCMgD7I80SfKzq/Fk50TkXdQlR0gxscXcyTy47INtmu10lkq2tTseUZsSpsTp87nySKPiyRordbOx88YS0mpF7ZQ7Gi+dyLFeVGBu0RkannenxtTijrW3tqVu/s1WH4hLRVNwOEc28l6xTfr+uae1lUcVPf6pAV+Xh/deycwhzz/Y45V3RRsFaHFZqkjnuWR+lXe3a6dsi2fas/DgbQqppK5wI1W68K5Ya3ppOJoXWVNRPP7TvuXJHS+KSuunZSKJL3J6LiXPFVp7x0fGJ5Weni8/qMGblu89KXAgGNJuL2JPF2p4WCRveQEfrVR7tWNpxo+2mB3of++w8i+Ox1pfG3D1Z5KCm48sJUInY20rycfTWvH+jG/rJD5NI/1SSju0tKSs7GKttHPdbXFyR/566yl91uhZd/lzI0GtoQKUotjMhmvaRoak/HhS/z6JLXjtbGrlmyR8sftWfvvr1dRAwOruPa4FgnFCXK2bUifBd3fm2Nd5x2wpg+ixOwGqMi4la/VsN0vEsU39Q9QpQsK5EvvPU2n9aQ3+suDakwmyFlcCrpTLZ2Pd6oMsKI0cEGF38dU+vEjaIcKziqOemhwsj2R0efoyuoLzZDpmEExA+TJ2yXniX23Zus3PuEUdz7NhHdTC8trzm3QyhrnYgbL9+555lk75IRimfH39Exfm3klZ+/BBMvkpOVvfvVtbNK/Ne89IKpeldD/SQQDPwMGL8rmYhXIrB/8v5Hiw9Ybt85u8f15apG/Ll2LyG/c2zzfjcMuVurqq2q81x6Qo9HNcw0HBr6YXRRdnZu+Zb9LzS4NPbH3kx1zrvoA1XDPxA9+nXxZLxf96LB/X0/SQTA2eKD+YuhGRBrw1uOFKUWRMsdvVJEHoNtRh8RBvDxJ0xy/ALj7A4u3Gbw3DSwF064Sq6isG8jcSVFIsqtcW9EL85xinGoYBTNF7++1ZBcUd+d4J7TjWihj6ExcLQGi76AampDnRi8eOguo2BSR7Erh3LSuHO1EHm97hC9KViAFbNTKpYcl9o1rdH+lmloV3jM9fOdU6Lxl+q7SyV5Qzsk4tENA7pc30MYvtUBM/Duum1LD0RdL4l/D+UoA6pIsm6zocBrlucM4XrR33Ztfbp+MOOWXc965/S84eJoTZ2bX5i9grJ4l3jSOlhV8833Z9qXXTj5XdHFu9CvkK6oqrdu40FBgkvPnYIdNxlVVK1+JVzRdUPxuliIdS5QMUbVruv8rH+Xa8sph6jtOH4NqC3byta8fujfpRC9oGfRNTnbyl+oj4YJUSJCXI56DTHK14t73xQ/Kq6qjvmX0Cf+UA5x/UEqbYNGtO9DGyJFqYUI5I/9rbhdDeNYX8UqZt1zovauSxcqiNyBCPad7xOvkBu5oQN4zlUeJpBIprMU0xzmLyznr29NqXePuPIsHBk71wxk/dlz7E4pK924Wk2cbaYUbKIcbSEBVIKAYs+FE3tTLURB7zuyRdT3LMdGxE6mhyZ3TTuppbw5UfoDVcDU9b0GvvTr5dE3/4YJYuKHrnjUNSllgZTj9u9XfJW2oeyl+pWEu2dfcWltPCYc5uQG7io/Daj4eZvBI/3Pvm3O+k+m18cnH297xuvT+cpoOpnsbot7ipVMDz+n+7Bil7q9hAjpVWX7b4rkFE1H1E1S14pcfPbEf2KFdRfXSL5j2708V01Hgri+DK+IWvYmUgksvCaVum60pibey/W8RYqiinsCUxzQ/e76+Yf+XaqGTKyoV4mH9fMWESL7MCFHHewpvt9qYYCLWEjr4Y8KQoh+mzHnI03XfyUuoIvB4xugDZGi1AIECsf+XHz13/O48olTNmtYY47h1FvJPO6Ki0klipY+nsONskZ3FKLxOw4a1jUi7ooaiMPeFyeJiu6iwVxxkXtagbBEP5NK1H5GGClAVDXiNeaNxJaUOcrwKhXhgUe+MOstbqZEOK0fQRuQ1/v2QUjHD2BQ99jJ5OC6HU+e9IgDV1F6q8y3jPn/6aFwB12/poCBNVHVVRc43yC8t0lp2w5AEFkleYORP/fZXzJcM9XXS6tfSuRlD81C4kZQl7SVwvwOfrmZ7xw4d1ZWzqu25Y4KRYLw3u4tIfHD3yNMcAW4BaJHuMlJJz7/4bbnvD6drgmGzMg5iECwvKziolg0DV27FfZb886sem/H81xhdQlBYl628LQcEfVAJKDmbSh75Zhj0TSVkGAwMB7+K0oiP7qisqbmqPMMEaEXiEzdViF6tkct8Vkoj+6PvVsndj3XOXdILVWsBQX6BRdX2u+vhTZADp5sZkJFY38oPIGfUKZuoG56YKMPTD5niQtwMzDml2fsDXC1fqymHKHR4odymyIEyeOEJVNsdGzX0xfGds++pm7n7Mti+xYV2g69EiH+KkW+T0RFhi/1E8id0KjluUU38A2MoAiyJzW4G4uAYoi4YMQd1m31cSx5vW6/Xgnq00UUuaX844cnnIoggXZ9RAsEC7CmgptOfTYRs26glvcj1yLFhmbeu2H/S0xB+maRPodAINdWFR1si6JUykUB1ahf1VhRCCXiw9ENFWqTiS+fP/AzxoHTi984NQN6XERG9eKSk5v/hWAoNMwMhcZt2ffCWUKQ6ufZObblxeN1j77w1hMXqypXVIPtjNbVzby4zw3+ypx+NwqpKtHF/zuLKM4TNyrveILkg0SqDWPa7cDzLftW1dq2VdUx5+L/O7Rdlj6gv51m19bWxH5eWxffJY7zjx5wYD/18J+w6MARXWnxooPHQopSMxLuOF6k+71fUY73iK7AxbRuBTuZ46kLi4Rv7Y/S1kDT7zpWu6ABX/PXSMMMcSdFx7Ka+UdknWjt0lfSZUuuMHXzTQUrvmdFTJ1/AnlT7oUTwJm+1F+9VmTtvnnodkbdEs9zUlC76IRZvOYkp+dn7lYC+nQF1KUVHz3SqPpRR0VVBiH/4xVd3GA4sk1VtCtFJvGs0tgrudsqV39aE0o42SLCFMGN03Nr+RqkEHWsQupH2dfvVzD/GHspv+gJ1FTVmAnLPTgSPx5LXhGNpR6tqYl+zLiIdTF7cdPeVauEQCw59G0IE8cTSYr+/uN1W1f4IjeipqbuvJTt1o81E120hBA/4e9YJVbaTqfTKaVn0ZUjuhdcPqxX0VVDehVffVmfDlc3mAqEkFImREg7dBvGZLyVtr5TUjhoZV6w/28KIgOXaKr6jmaYb+wof/XFutr4a5j7EoC6Hjhmf+yVX1HK32AUirK186+DNkCKUjOR3WnCQE7dWQ5Fpa7n9qe1y096RjcC8ivKuOXfvISC3HS0NnreuB+4HjrbFy/bxf+G2OLjpsH9AhhZ2Xk7dCO8QHQDsKnQf+OCKd873jEYkfkiLBLZvdS1h2637EQX8WNq1eWfc7vf+mU1oP+S2fRX+9b9q0mVIM2gNlQTnp1f8TPt8JV7ale/srt2dYNKnEK7c/yVe9OuW18aeFfNy0uJGljmOfSikoKrPruvYvU2jNjHkKgARQiP5bFH+/Uc1a+k8NK1yYSVU1FeMW9/adXHfhjneLT/0d6HYyWQ5zoHR4ZvKV2zSdPUWXW1qSsHdh/2S38NKtGNTCWiyZp4LLUFE9HBTDsrHMdbKYTqVaFSr9VUxxtkQIWgvRhPeA08pMrEWzs8Ru6MRVM9OcP3iJveIOEkveLa6XpLoTz2zovxtPM9EZjNPvS4sviblyVSyXF1ztrnoQ2QnlIzEOk4frRtpWd7gKpEZuoKVrv8lJZJ4ollFimYsB4BukD8cI46gZVx58uK6FakLf4iRBd86UTnFHf9sxIpb3Fi5xN3Qc7ES3UTPWcS9ttkzsT9UPu/EiMNjqmbn8SBibuEMJWQ8KguNL58z6c7cBZgpVWipFDnm5FmqP/AqjLOS3vfrdn6xAxoIiINfnFOOCQikGqRCCNHte04wgm/vJVL4eAEZ4+hLxOCrnXs9N9LCq+alfLoLdyxXgZIZ9ema8JJcNf7QzlEVPr42s3LXuvVeUSAM/VzoqtZdbTXiKfZc7gu0WA+4M6qV6d2zhqiWzYr3Vz6nNcl9/L/21j6Qn0XqkPokt7CK79M3FPivoONxXsUVtMicP53fGnVS9892mvFnHV+vaheATzQn8idSrH3G1iLSfrh75NHydGl+CdLoI2QotREIoVjvuA61oMixbxfXJfns5plJ5UNOhxVC7xuU3oBUOeoHoLrsDLK2E6ILr3mROfCOeNN0VfITsRSn5YMqV3wps0n9MFB8oGuoml2zsQ9YtuLRztWweoq12Of48Tz5+TVixfHKMw4b9Lf11iIrq5AitaTWs7k2h1PNcuUFtEvyzezIjU8mVWbSBzdotm6f8X0EDrvW+FI1icHtpXWvLS7MPfqS5yU90+RU3Aqa179KCcy5ELE2DxA7vlIMyGg6TN373/+7vpz7H12VYeCa6/dvvfZo84PjLGPboodRdr3Rl+bCNFPH++pefXgDWN/4u0fQBNXA0yxD084xCRTkN23JhDIHX6fR70HGagVHJGrvCYKko8I22f7RqpqKCOO2iCx8iJWt+TyRpxKpL/hXKSIvgr1/jewsG5hWToNk0R2GYJBbQFExuYc7dh0yl2MsQdGUB9VvyFreCHxQzRMWrTQWKjrVD279+1LVTOQz1w6tbkEyYd5XlcraT3P9dC5FZXLj7mEUoKvu2B/9KUG8wQratZ8XGe9ffXeqpfqhxXWxl7bXpd44wIllFftaXnAtUiDTNf+ytUvguSUkKJ0Ciih6yKgD/qAY/4LwMZW4Qad71Yt3gLNgFU+61XmxOqoZzdKeI6HqpEhHClYfMv7G+yomfeqx5THRJYtWw0YR//xUHeFcF+ogtEEs9N4HalksKppushMtVgNsnDJVIVoZKlqBItZ2hpdu+2Jd6GZCHe4KYxULTuZst/esfHJZhNW8Tn+norcftRj/wFJsyBF6STBoaGjECQ/CASyBmISeoNy92y7akkpNCMM4fc0omZDzoSLoQmoGuooUk1pqD2yLre9f9ZnVYWsVzE7F3InHuFNedGlIglDPnFdrAZCObcW5edc7k9O5Zy3iCiFSm4WmqEuEfnxjjSdGlOzbVqzVnlEWLnYxSamLmvW7ypRvvz3CNyoR+GCrA6TBoCkyUhROgmM/OF/MXR1mR4Id8N6cE6yfMFldtUyB5oZz0GLGFJE1ynyWWgCnNMiBWvbjrU/adu3iSQbBE38FwjdYBy+30p7jzDR+4uY6NGC/MA9yF+fDvwicM2LECRNdDOfxUagmDnONTVbpzV72VmCUDedKMICstdAM8NAeVz4baCFIl8ASZORotQIgoWjQmb+sLdEP+gbCBPX5dqPEmULb4IWAmN1luc5ae7aJzSzjwcC3IsQrepY+72yOWtt7r3MMdawrh4538l1/gUsntpXXgnlFfFIfcU29t/56c1EqOQmglX8rGqG80WENLZ225MV0BJgOJtTq65876z90Mx4LppHQRURLhkJkiYjRekEhPOu/xKj6Z0Ea5dQIOssj19oVy67H1oQVju/yrOtvYzanaEpINIDY2Xn8Zo4Nr8dA4WAjr+lZI8lh+7jyRX+GMA3fVMqHrcA+7NJ+YkWYGo8ke5T84UgrVa1oOYlE9fUbn1yL7QQ1HUKteNEjU3Brpz/GvV4WSoR757T4aYISJqEFKXjYOYMXUQRfkAhgWyL8V+Krtr5tPbZVpn3hRB+VWTITIiMuhROEe45uuO6m47bqHrxLtvx/iMEN0xM7XeH73ZseJrWe0kM/Npu3PWamJz+lHD3qR2Ecb5a1cOKm0qMiO14OgotiEOdYgSk5YYzcLqIMg9sxr8IkiYhRekoBPJvGGPmXLedqOY4QPpWy6WDvarlP4FWhHPynJ/NV3RzEpwCWuF4jTFQ7VT8hCl1zsg3MOFACP3qETvjKx5FHMew8Ew8V5jcycR0aCLB7jf3V3TtJY7JhupPHr48tnNmswjd8WCUBsW/96GlYHw6Rn71cnozSJqEFKVDMPJGdVXDQ19EnC4haqA7Q+oc6jl93doVJ1yKp7khqraaUkKJQhpVZeBwEONd/bGx3LE/OVFbr3JBkjE2HyjSIDTyiJVMHMv+tV/OxLO81cDXNGncUKjHzf0UFa/kHO+u2fBYq/2ARRRjep7XYhOJafXC1zyP1Qrh66UXT5G/qyYgPzyBkTvslmDe9a9yZm8wgqGrPaJvSzvO2FT54pvs2mdPalJtc0Gr5la6DKoRKKeUZiYYDRDfLnWqlzXKOE6nvCf85aKJqRw5XSG64vd2LPlN0WgcNIFIr1vOUzVlCVbMt+s2Pd6qkz05Qn52cTe0IERR14qbSUhkToeD5JQ5s0UJDeoLcPEeBcMMxTCHEC3o2qD+zq5Y0ovWPdtqiyceC07QWt/JQQW3XA8niW4YE1SEGj+1oHbpMhFNxFVVGQdZ4440a9PPPwjeS6e8YlK4580Xm8HgTEQCW2rXP3pKXdKmIDKRunjzzT5847BXedEfNiFo0xrX7Z0zW5T4W8IE5uuSKXd92nJ+7Tipjk7ZgjYtBXoonkufxMgDTcET4CQRP8DeCtFPyjwWFtQyv5wTUsjnoRkJdL9xnKaryxyPb6755OEboA3AiiKSh6RlvSvGVnOPiv+8xtfRkhyBnJAL747xxyg7GbiAu8jP+8vrPIiwd9VJHio8FN5ZJWTfyRzjOuhBjXhTDVX5XBrgT9AMBHtMuU4laI7D0FteMjoR2ghEFCaimDpoQTilm1xK6zhFPUFyykhPKYOh1Qs86jr7RHqslzCgyckc61EnhEA9KQ+FVy94BSEo48DO0nPHF0ETCfW86TI9YE5nxHhBeFJXp/fMPeE6di2BkTe6vvA5INyiC/Y6VYuinFFbZBnkzb4JSFHKcAhR94quhwaa0egR5Hrh5HxhuoZtxzph5u2I11NDqxnXhJ+l3ghNINzr5sGqQpZ5Llob2zhtpFM6v00SBj6MQ6C+viLCYWhpkOgF++uoS04Z+eFlOEIcXvUXj1MC+i2NPgagI+VAXI9Wwkli2+50PwunGcopd7Wyeossm6IsAGy8byUSY6CNcWqWJRgwvz52FrQ0nKuir9hmAnw6IEUpw8EIPQbMFT8pe0jjD+KdRTdCRAj8pKdteJVzn8U0nfTs5HlwCmT3ua23pmpLOdI/rt3w2HXOvnmNWkSlpUGI12EELRop4ZzRunghVTxq0ZpTpztSlDIcr3LeXtexKwlmJmSNzmvMMcIXKiLCQhEPTmlyKwe+iSCUg3LHNGr1kwNEek3tpajKQk70D0WEdEqDPlsKzJmFETsHWhARofZXVc0ATJq9ysGZhBSldgD37E8Ugvwll0Y0pr3o7eV/OleNboVTwGP8Ob9kiaIojRaWcM+bOmua+hwo+t6qjx4ald4zu0VN5ZOFEFwnuqUXQguCEBpAMDGwou8AySkjRaldoE8H5rmKpg5tTGuC+Pn+fZsxdkp1mT2qvOg7tgrhjRp1He5xU56qK/ORapamo7EmGeQtha7qW13mng8tCOe0hxAmrGh6i1QjOFOQotQOwFhZ4lLkitCnUSO7hctaIjQlxSrmndoIZgrvck4AceWSEzUN95iSrWhoDVGDOB2LjUrunNmqSzA1GoS2C5HuBi0Jo2Mpd5Gw1t8GySkjRakdwOqWVHqOlyaq2hmCIwpO1J4jZDLGXThVYktrKHUrOCFFJDTsmNdIpMeUoK5rq1UzO5yOJ6Ykdsxs0fIjTUEI+8cMQTC36019oAVA4etvMg1yHvUcC1NbLhrQBKQotRNUI/iWCF0wEP2EPo8wqsOI4CYtqYMVVO65KT/71/Fo+yPdbjSNoPmsogcj6Wj04sT2pzPaR6Gcb9dVE2Fdb5GKoQjR24WbjrDIeFpl81u8FMvpjBSldgJjsBxxDtg4sa/EmSssFH07NAGCIU2Q6MJh3OVo+1Udz0WacU4iGhsf3z7zpMdDtTY1257azai9R3w6LTLVhTG3l1A+8dmjOSBpElKU2gmiWzCXM8dF1B58orYII53Tps3owIQ4+NNh0EdMb8npPWWaZoavS9bGbxNdtpMeNd5W2K7zusvdbjk979CgGSGREf0N1ezh2F4CXLdFSyWfCUhRai8IX0n4PFVCnrqesC1nQYTg1D0lqE9vE+HBCNMcNThPbu+bH8WKcXsyYX9ZdNmWQzuCgfoIIC3AEPoKNCMYefdjlSiYaC95yeflwMkmIkWpHUEw2UgUJQSRkccdbU2QoiDANdAEhDviIu7XMUEHp0zk9b7lISMQups67BuxrU89Cu0Ma8+c1R6DPQz4feFONzfLpFk9f+xFikLG+vVKgOPvgqTJSFFqTxC0DWFN3OyN41aAFN0uwjg/qbIlh+M5jg6i56Yauj9nDPL73Pp9PRS+J5V2v1m3bfrfoJ3iue5Drp3ORhr5BTQRNXds2HbjC4D41dSNZ53aZetB0mSkKLUjKFO2YKQIkzlwzJVzwx0nFXiUKq7jNcnoZpQHqHDXw1lhJ7f3LTcTXf2ulXK/W7d52l+hHWPvnvkH5lmbKLW+kt1tasdTPQ8RggTEezVgBrtQj2/mrjMWJM2CFKV2hOfyV5gnelQePWZlQ4KxqohoijPWpOWEhCgVY47BCIbuUE3jn+m09+uaTY/9AU4HkH63oqiK7aXfziqZetJ1o5S8UV9AKLFVV9WBadvZjbByrRdbmVHTatozUpTaEzUL33BZyqFe6pgDKBGgPOY71JQFoClwMD3ugG3bX6irS/4gtnV6s1SizASc0rmvWy77um4GOwn5fSfU9ZbjllfRcidhNWf81UrWsGkk95o9ioYe1LWcQoq1jZoauMquWtJii2ieicgKee0MxJx9RNG789CwEpp4btfh+zGgMKtfXpudeulXc1iEAdUNLQAVldEf8fI5j8Bphr1H/E0dJ5cJN+hPHLwlRvHYCmHGrSeqUkYIiQmTiFPq5YuMZzdg3jlIfOgcIsLWo0KwtbWO6y139s+9DyTNjhSldoZGyEcYQXeqEL++0hGixDkz/YqsnLJTN10xm0iIqboeeUUI0oNwmmKXzltqAyzViifdpJvZn2fU7Yc5G4x4ff8XEfFBY6SnOVbLFGyWcsbf8Oz0fxKlMzeApMWQotTOsG1vgWGSsWpAH+LVwdOH7xdeUsDP4jNGT61LkTWym6KyPyNMwUkkfwdnAE7Z/NkOwOwDzwMdJiqiA0w452aqbGGLLjYgORIpSu0OvooDEz0N7K8t9uWjNfBr5DNOhV8CJ1VPCRWOD4bDgSXiDDnJWCwO1FsBZyCp/Qv8apn+PxskrY40utsZLPZcKQc37lG3K84ZceT3h5CBEPId71w4CdQOE5Sc7PDrkUjWANd1AWG1FNIrZa1pSasjRakdghWtQkRKIl4i/Y/YKbocviih+uqsjScUUucGTGNgx8KASNx5wttFb4JE0gZIUWqHaEqwglMiTFhyxORc4YMoCIkcHPBG14kO95j8y0AgNN7IDt0aSyaf96vEMTvV5suWS85MpCi1Qxj3PkJYAV1TjxjZzRnlCiH+kIBGiVLeWVP/GQ5GflyXSt1SW125oqa8oi8WZwHPXgYSSRsgRakdkoynFgBzhNmNjhjZLfps9ZP73cSqE1YJiPS68eeart+dsO0fJLfMmhmtjXVMpr0unktfBftFafJK2gQpSu0Rht7Cop8moqKzj9yJGGMck+B1x/1uA92mfMEMhb5Tl3C+ENs847f1p6XsTj8h67n8IZBI2ggpSu0QGl1e51InxhEPHbkXMX8irZCsY363qGjMIENDf4xFne+ktz395IHthqreJMzzJCA+GySSNkKKUnuF+WWnFSDm9T0P3cyF4+R/q5zxo6fz80fnBEPa4/68LTuZ+N/0kfxRFwsd60I5vAZ1y5tWtlIiaQJSlNopCsFljLmACCk+dLsQo0pK6yOlIwfG5o7OCmeFXlS17GS8JnENq1h8cAkmQ8M/8X0qJ5GSXTdJmyJFqb2CRHYNe4AU3GBpbc7Ybu7XNwHIPvwQPaD9QjWDHZOx5LdYxcKDq52g/DEdCCGjhRW1H6LLF4BE0oZIUWqnKIpejoGAphv9Dt3OOK3i3PMHTjYQJbXjpF+FssJ3xWvitzr7Zr1y6D6swHcZJ2Bb/DcgkbQxUpTaKQgpdSBECWOlQd2kdO2KGoIVFwg692DbwrG35Bbk/MBOen9yS+esOrS9UjguP6ApX+SU1UDtkn+ARNLGSFFqryAcJ5gAJ+iIYm4YI6ZFQvVLbpPCUdfmFWT9JZ1MTUvsnPHzw9vqhvYXjxPdStF2W3dbcnohqwS0U1yPl4pAyV9spO/h+xDAFtNULlK7TDhXDwYWU4peTtfV3nt4O63DxGIhYLdxF7ngOmdEmRJJ5iMjpXZKOp1+hzMKjNIeR+zk6ONUInm1GQjOpBQ2J6srPudWrThihLdK0B+BY0hZ9MeQelaO4JZkBFKU2ikiy7aNgyesICd4+D7XYW/5A40cK9E3Xl37Jafy2dLD2yiFo+9UFeVW2+VvQfX834NEkiFIUWqvMJpkfppN2EcoZ3iDbnggoFytEFVk0yhmnrPj8EPVwrGFhkb+7lGaclLWOJBIMggpSu2V5KoEApwCpqgc4YPpfy1v5BQ9nDUMY7V+Zi5S1L8cfqimKU9zxQinPPIrqFvcpKWYJJLmRopSOwYRVEYQBqwo9UsuGQWjeqhZWb/1HL4iGDBWKpiLJJ13MxjXdD1wjFY4+h+AybWUK2+y/bPluCRJxoFA0m4xO4x6XyT9z8emMQJcul0xzKWM4br4ticvVXJvKFJ1tEM8N207/Y6IqO4ghvLzYCByo+14G+zSOf1BIslAZKTUjlEU1aGMQ5dOHUfn5gafxYrG3WjNBH+fV/NMeTpNf6WqWHTXjIsJZu9pinZjPGWtt9PpISCRZCgEJO0WM6//BI9Cb8d2LwFiJq266utT5Uv2HGxgbX3FUfrsAs77cazalKuP88r548DabIFEkqHIwZPtGEKUuL/wJBEBb6ymZnS6dNH2IxrVLH2CAjwBEkk7QYpSO0bFKvJn3rqgfJgunf8BSCSnAVKU2imBLhPPE5m1MYhhYJ4dAYnkNEEa3e2QYJfxEUNXnjfMLBMrHGwr2QEkktMEKUrtEFVXFoXCWXln9e/xMgcqfGxKIHC1HN4hOS2QotTOyOl985N6IDK0pKT4h7Zl/4TUr9DNCXAIgURyGiA9pXZEuNuN9wdCOZ8xNeU3+3ZuLdLNrHJNqJJD6wfB+qO64yCRtHOkKLUTsnveNlVT0A+Y5/0rlaz5qetGF8Zrqze4FgNMiK9KORwkkvaPFKV2gN5p4nlEQf/kBC/d/9EjX/a3RYquLEh7CBD3V1QSooRQHyFK74FE0s6RnlJ7gHjTPM62W7HYZw5ssi2+BGj9qiXAGAWioeEgkZwGSFHKcIwuYx40A8GQk0reGd+7MHpgux195deIOykuIiXur0zp2ReCRHIaIEUpgwn3nPKd7Oz8SdyDX6T3Lvrk8P0qMV4S3TbAiADj3ACJ5DRAilKGkt1zyiTTMH6m68bq6NaZ047WxnbxJwhroBAdwOPyu5ScFsgLOQPJ6zmlo6ppf1U1c6ebjt16rHackR96Hllr2SgOOPB5kEhOA+Qo4Awk3HX0hnBWkU7d5MDyjbMSJ2qPgtcGeHJ1CiSS0wApShlGdvdx01Q9eD1nfETV5pkfgkRyhiHHKWUQott2D1Lx9YySb1VveUoKkuSMREZKGUJOtxv7EVNdQj00q3bLjPtAIjlDkZFShsAIegw8sqV2y1NSkCRnNDL7lgGEu095lqum4dnWZJBIznBkpNTG5PSafB8OhrvTRGpU3e65MoMmOeORotSGCEG6DenaN2g69aW6bTO3gkQikUZ3W5Hfe/L5QMhqQvCs8k9mfgkkEkk9ct23NiKr08BFHGGo+GTmCJBIJAeRRncbUNxv4jSFKCr2nKEgkUgaID2lVqao/8RfYjN4nZd2JpRvmr8XJBJJA2Sk1Irk9BrzfcUMfo567P7962e/DRKJ5Aik0d1K5PaePIjo6suIkAUVH0yfChKJ5KjISKkViHQbHwRVfQxA2+GkrDtAIpEcE+kptQJcgemUg87t1BV1W+Y5IJFIjokUpRYm0n30F1XVvMbzvNtrt8zdDxKJ5LhIUWpBcnqPvw6p2u8IRrOqN8xdDBKJ5IRIo7uFyOs9PsdhdF0gGFpf/uHMkSCRSBqFNLpbCI7haTWQpVHXmwISiaTRyO5bC9Bh4C0POJwMYa5zQ9XGuXGQSCSNRopSM9PxnJu/SJH6We6536ndOPtVkEgkJ4X0lJqR3B5jc0BV38FYnVu1YdYPQCKRnDTSU2pGHI8uQpy8LgVJIjl1ZPetmYiUjHmcaEYBdWyZaZNImoAUpWYgp8f4H6p6aAJl9K7qnbKkrUTSFGT3rYnk9Jw4UURI3w9HQo9Wb5q5ECQSSZOQRncTyOs9qQuo+luGqu/Y98HjQ0AikTQZGSk1AZc5TxOMY8yzZElbiaSZkJ7SKRLsMuLPmKglCkIXl348Uw6QlEiaCSlKp0BW9/FfMAOBWz2OHyv96KlykEgkzYb0lE6S3B6TL0YqmQuK8WH1J9PGgkQiaVakKJ0EWSXjTRfzdWYgsqP6k6ekjySRtADS6D4JXE7nq2rAZrbzRZBIJC2C9JQaSaT7hJmqETiXU3pzzdbZO0AikbQIMlJqBDk9JnyO6Op4xNlTNZtnvQISiaTFkJ7SCcjpNuY80LUXNaJ+XL5+1hUgkUhaFBkpnQCPuY9jDrVAveEgkUhaHOkpHYfsnmOfwKrZjzM+sXzTHDnRViJpBaQoHYOc3pN/rGr6zS5Dj9Zunv4MSCSSVkF6Skch3H3cCE0zFjGkvF67ccY1IJFIWg0ZKR1GpNt4XfhI/7A9vgFo6nqQSCStihSlw/DAWwFEywbm3ZDYuZCCRCJpVaQoHUJOn4n/5phcQCm6J75lzhaQSCStjhwS8F/yeo+/QwvodwdMY5YQpDkgkUjaBGl0Cwr6TrwUY2Wlauh796596myQSCRtxhnffSvsPb4AYbKQaBrlnjcMJBJJm3LGixJRYLHwkYoJJlfv+WD6PpBIJG3KGe0pdR04+UEHtMFYUe7fs3baSyCRSNqcM9ZT6jLgxs+nPe9hzpXV1RvnXgcSiSQjOCMjpbxeY/vYjP1eUQJvM9eVE20lkgzijIuUsktGGVjFr3PF0MC1L6rdtsQCiUSSMZxRRnd291EBQvBzWA908xz3SilIEknmcUaJkqaRx7EWvMR12Vdqtyz4GCQSScZxxnhKhb1GfZdoxmRTNx+v3jj7YZBIJBnJGeEpFZ81ZjIQY7aqGa/tWfvUlSCRSDKW0y5SyisZVhgqvubLB54X9xkxECnKwwjjnelkbBRIJJKM5rTylHI6Dy22rfQrkUj46kQZQMd+o7sAIcscinM4sy+u3rw4DhKJJKM5bSKlcNEV2cz1PszKzXle0VBFl/5jinRVX6EQtQtn7OfVmxZtA4lEkvGcNpGSQmCBqoZyGLPv0/WQCpjMIiTY10qn/lG9ad7PQCKRtAtOi0jJLBjy7UQahiLD+DVHhHmM/9VhytVJx52z/+PZXwOJRNJuaPfZNxIZ3INoeFsolA05hdnd4vH4FYDNpxBWP0onEoNiOxalQSKRtBsItHPMrO5zGdZ69BvQcx4DTF2LPsaJuUd02wbHti+UxrZE0s5o1903NWfIb1xGru3bswtEsrPXV1bVPpqmJGUnk9dEt86vAYlE0u5ot6JEsoaMBkX9fk5uNvTs22fmjq27fsK5Acyjk+u2zZOZNomkndIuPSU1+wpVNY0tjsdKxo0aYm/fvU8vLbfAcZxRtVvmytVsJZJ2TLscEoBV9QnHdUv69OkFVXUpfW9FUkRI8FMpSBJJ+6f9RUqBy0bqocAzeXlZ0LFLIWzbVQMIoUdrNs76HEgkknZP+xIl41Kih4ObRaTU45yz+8LmbbuFICmr67bJcrYSyelC+zK6CcwFQnoEwyEoLa8FogZeloIkkZxetB9PyRz0bRwMTuAIARP/LIftthKxq0EikZxWtI/uW+iyy7Wg8Yon3m4oEAKsaBVO2hua2rtwPUgkktOKzBclfbBOwoGdgHmxquoQCmXXpJOpi5N7F28HiURy2pHx3TekqzMwIcUcGJimCemkdaMUJInk9CWzje6sq64wg8YkxoSlZAQhnebfTu5d+AJIJJLTloyOlMxg1t8p90BVETiO8oS9f/6fQCKRnNZkrCihnKsmMsTO86Mk6rJ1rGr+XSCRSE57MrL7hrOuUMUb+x33bKAevMms9GCQSCRnBBkpSixl/RBrwRIn5X3I7OSVkFgjV7KVSM4QMrLIGwr23E3jiRxgdBSkXqUgkUjOGM6IxSglEkn74YxZtlsikbQPpChJJJKMQoqSRCLJKKQoSSSSjEKKkkQiySikKEkkkoxCipJEIskopChJJJKMQoqSRCLJKKQoSSSSjEKKkkQiySikKEkkkoxCipJEIskopChJJJKMQoqSRCLJKKQoSSSSjEKKkkQiySikKEkkkoxCipJEIskopChJJJKMQoqSRCLJKKQoSSSSjEKKkkQiySj+H+wwga+zo+WXAAAAAElFTkSuQmCC" alt="" width="293" height="50" class="signatory-image" alt="Authorized Signatory Seal" />               <div class="signatory-line">Authorized Signatory</div>
              </div>

                <div class="summary-box">
                <div class="summary-row"><span>Gross Course Fee</span><span>₹${(Number(studentProfile.totalFee) || 0).toLocaleString('en-IN')}.00</span></div>
                <div class="summary-row" style="color: #dc2626;"><span>Allowed Discount (-)</span><span>₹${(Number(studentProfile.discount) || 0).toLocaleString('en-IN')}.00</span></div>
                <div class="summary-row"><span>Total Paid Collections</span><span>₹${metrics.paid.toLocaleString('en-IN')}.00</span></div>
                <div class="summary-row total-row"><span>Outstanding Balance</span><span>₹${metrics.balance.toLocaleString('en-IN')}.00</span></div>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
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
      setTimeout(() => {
        if (printFrame.parentNode) document.body.removeChild(printFrame);
      }, 1000);
    }, 250);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 text-gray-800 dark:text-gray-100 min-h-screen font-sans">

      {/* 1. Portal Header Bar with Integrated Logout */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><User size={28} /></div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase text-gray-900 dark:text-white">{studentProfile.name}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Student ID: {studentProfile.id.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${studentProfile.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-500/20' : 'bg-gray-100 text-gray-700 border dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}`}>{studentProfile.status || 'Active'}</span>
          <button onClick={downloadStatementReceipt} className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-500 rounded-xl transition-all border border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs font-black uppercase tracking-wider"><Download size={15} /> Statement</button>
          {studentProfile.status === 'Completed' && (
            <button onClick={() => generateCertificate(studentProfile)} className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/10"><Award size={15} /> Certificate</button>
          )}
          <button onClick={handleLogout} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 flex items-center gap-2 text-xs font-black uppercase tracking-wider"><LogOut size={15} /> Logout</button>
        </div>
      </div>

      {/* 2. Unified Master Details Grid System */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Roster Card Box */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-sm relative group overflow-hidden animate-in fade-in duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><User size={14} className="text-gray-400" /> Student Matrix</h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Mobile</p>
              <p className="font-semibold text-sm">{studentProfile.mobile || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Enrolled Courses</p>
              <div className="flex flex-wrap gap-1">
                {studentProfile.courses && studentProfile.courses.length > 0 ? (
                  studentProfile.courses.map((course, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md font-bold text-xs border border-indigo-200/40 dark:border-indigo-500/10 uppercase tracking-wide">
                      {typeof course === 'object' ? course.name : course}
                    </span>
                  ))
                ) : (
                  <span className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 uppercase">{studentProfile.course || "N/A"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Google Email Account</p>
            <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 break-all mt-0.5"> {studentProfile.email || "No email assigned"}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/50">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Timing Batch</p>
              <p className="font-bold text-xs text-gray-600 dark:text-gray-300 mt-0.5">{studentProfile.batchFrom && studentProfile.batchTo ? `${studentProfile.batchFrom} - ${studentProfile.batchTo}` : 'Flexible'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Joining</p>
              <p className="font-bold text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                {studentProfile.joiningDate?.seconds ? new Date(studentProfile.joiningDate.seconds * 1000).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Performance Tracking Box */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-sm flex flex-col justify-between animate-in fade-in duration-400">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><CheckSquare size={14} className="text-indigo-500" /> Attendance Metrics</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black tracking-tight ${metrics.ratio >= 85 ? 'text-green-500' : metrics.ratio >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{metrics.ratio}%</span>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Presence Index</span>
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Logged status: <span className="text-gray-700 dark:text-gray-200 font-black">{metrics.present} Days Present</span> out of {metrics.total} total tracks</p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
            <div className={`h-full ${metrics.ratio >= 85 ? 'bg-green-500' : metrics.ratio >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${metrics.ratio}%` }} />
          </div>
        </div>

        {/* Financial Accounting Ledger Box */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-sm animate-in fade-in duration-500">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><DollarSign size={14} className="text-emerald-500" /> Financial Statement</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-bold text-gray-400 uppercase tracking-wider"><span>Gross Tuition</span><span>₹{(Number(studentProfile.totalFee) || 0).toLocaleString('en-IN')}.00</span></div>
            {Number(studentProfile.discount) > 0 && (
              <div className="flex justify-between font-bold text-red-500 uppercase tracking-wider"><span>Discount Allowed (-)</span><span>₹{(Number(studentProfile.discount) || 0).toLocaleString('en-IN')}.00</span></div>
            )}
            <div className="flex justify-between font-black text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-1.5 uppercase tracking-wider"><span>Paid Ledger</span><span>₹{metrics.paid.toLocaleString('en-IN')}.00</span></div>
            <div className="flex justify-between font-black text-sm text-indigo-600 dark:text-indigo-400 border-t border-gray-100 dark:border-gray-800/80 pt-2 uppercase tracking-widest">
              <span>Outstanding</span><span>₹{metrics.balance.toLocaleString('en-IN')}.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Redesigned 8:4 Grid Row Workspace containing Lessons and Assignments side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-500">

        {/* LEFT PANEL: Classroom Syllabus Log Timeline (8 Columns) */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm h-full">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="text-indigo-500" size={20} />
            <div>
              <h3 className="text-lg font-bold uppercase tracking-tight text-gray-900 dark:text-white">Live Classroom Updates</h3>
              <p className="text-xs text-gray-500 font-medium">Syllabus details logged chronologically by faculty instructors for your profile</p>
            </div>
          </div>

          {sessionUpdates.length > 0 ? (
            <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-3 pl-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {sessionUpdates.map((session) => (
                <div key={session.id} className="relative group">
                  <span className="absolute -left-[31px] top-1.5 flex h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-gray-900 transition-transform group-hover:scale-110" />
                  <div className="bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase tracking-wide border border-indigo-500/10">
                          {session.course}
                        </span>
                        <p className="text-xs text-gray-400 font-bold mt-2">Faculty Mentor: <span className="text-gray-700 dark:text-gray-300 font-extrabold">{session.facultyName}</span></p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-1 rounded-xl self-start sm:self-center">{session.date ? session.date.split('-').reverse().join('/') : 'N/A'} ({session.batchSlot})</span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Topics Covered</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-pre-line leading-relaxed">{session.topicsCovered}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 font-medium text-sm bg-gray-50 dark:bg-gray-950">
              No dynamic classroom updates logged for your assigned tracks yet.
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Interactive Assignments Centre Workspace (4 Columns) */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm h-full">
          <div className="flex items-center gap-3 mb-6">
            <CheckSquare className="text-emerald-500" size={20} />
            <div>
              <h3 className="text-lg font-bold uppercase tracking-tight text-gray-900 dark:text-white">Active Assignments</h3>
              <p className="text-xs text-gray-500 font-medium">Tasks explicitly set for your account</p>
            </div>
          </div>

          {assignments.length > 0 ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {assignments.map((task) => {
                const submissionStatus = (task.submissions && task.submissions[studentProfile.id]) || 'Pending';
                const detail = task.submissionDetails && task.submissionDetails[studentProfile.id];
                const isWorkingOnThis = activeSubmissionId === task.id;
                const isOverdue = new Date(task.dueDate) < new Date() && studentProfile.status !== 'Completed';

                return (
                  <div key={task.id} className="bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-4 shadow-xs">
                    <div>
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wide border border-emerald-500/10">
                          {task.course}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${submissionStatus === 'Completed'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : isOverdue
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                          {submissionStatus === 'Completed' ? '✓ Done' : isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mt-3 tracking-tight">{task.title}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1 whitespace-pre-line leading-relaxed">{task.description}</p>

                      {/* Attached Handout Downloader Button */}
                      {task.fileAttachment && (
                        <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                          <FileText className="text-indigo-500 shrink-0" size={15} />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate tracking-tight max-w-[120px]">{task.fileAttachment.name}</span>
                          <a href={task.fileAttachment.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"><Download size={10} /> Get File</a>
                        </div>
                      )}
                    </div>

                    {/* Submit Answer Action Fields Accordion Drawer */}
                    <div className="pt-3 border-t border-gray-200/50 dark:border-gray-900 space-y-3">
                      {submissionStatus === 'Completed' ? (
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-green-500/10 space-y-1 shadow-xs text-[11px]">
                          <p className="text-[10px] text-green-500 font-black uppercase flex items-center gap-1"><CheckCircle2 size={11} /> Submitted: {detail?.turnedInAt}</p>
                          {detail?.studentNotes && <p className="text-gray-600 dark:text-gray-400 italic font-medium">" {detail.studentNotes} "</p>}
                          {detail?.fileUrl && (
                            <a href={detail.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 font-bold hover:underline inline-flex items-center gap-1 mt-0.5">📄 Open Uploaded File</a>
                          )}
                        </div>
                      ) : !isWorkingOnThis ? (
                        <button onClick={() => setActiveSubmissionId(task.id)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl transition-all shadow-sm">
                          Submit Answer
                        </button>
                      ) : (
                        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-indigo-500/20 space-y-3 animate-in fade-in duration-200 shadow-sm text-[11px]">

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Solution Notes / Written Code</label>
                            <textarea value={studentNotes} onChange={e => setStudentNotes(e.target.value)} placeholder="Type notes or answers..." className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl h-14 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Upload Done File Asset</label>
                            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                              <input type="file" id="student-upload" onChange={e => setSubmissionFile(e.target.files[0])} className="hidden" />
                              <label htmlFor="student-upload" className="cursor-pointer bg-white dark:bg-gray-900 border hover:bg-indigo-500 hover:text-white px-2.5 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all">Select</label>
                              <span className="text-[10px] text-gray-400 truncate max-w-[100px] font-semibold">{submissionFile ? submissionFile.name : "No file"}</span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 pt-1">
                            <button onClick={() => handleTurnInAssignment(task.id)} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black text-[9px] uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-1 disabled:bg-gray-400 transition-all shadow-sm">
                              {submitting ? <Loader2 className="animate-spin" size={10} /> : null} Submit
                            </button>
                            <button onClick={() => { setActiveSubmissionId(null); setSubmissionFile(null); setStudentNotes(''); }} className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[9px] font-black uppercase tracking-wider px-2.5 py-2 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-900 flex flex-col gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                      <div className="flex justify-between items-center">
                        <span className="truncate max-w-[120px] text-indigo-500">By: {task.facultyName}</span>
                        <span>Assigned: {task.givenDate ? task.givenDate.split('-').reverse().join('/') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Slot: {task.batchSlot}</span>
                        <span className={isOverdue && submissionStatus !== 'Completed' ? 'text-red-400 font-black' : ''}>
                          Due: {task.dueDate ? task.dueDate.split('-').reverse().join('/') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 font-medium text-sm bg-gray-50 dark:bg-gray-950">
              No assignments published yet.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default StudentPortal;