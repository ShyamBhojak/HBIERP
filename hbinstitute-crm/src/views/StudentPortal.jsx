import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, appId } from '../config/firebase';
import { Award, Download, CheckSquare, DollarSign, User, BookOpen, Calendar, LogOut, Clock, FileText, CheckCircle2, Loader2, Globe, MapPin, Mail, Phone } from 'lucide-react';
import { generateCertificate } from '../utils/pdfGenerator';
import { downloadStatementReceipt } from '../utils/statementPrinter';
// Reference the provided logo asset file verbatim
import InstituteLogo from '../assets/2231B0A7-6B93-4CCF-AAC6-14A13C40CF2F.JPG.jpeg';
// import signatory from '../assets/signatory.PNG';

const StudentPortal = ({ user, studentProfileProp }) => {
  const [studentProfile, setStudentProfile] = useState(studentProfileProp);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [feesRecords, setFeesRecords] = useState([]);
  const [sessionUpdates, setSessionUpdates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [, setLoading] = useState(!studentProfileProp);
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
      console.error(err);
      alert("Could not process and dispatch submission payload parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };  

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 text-gray-800 dark:text-gray-100 min-h-screen font-sans">

      {/* REDESIGNED HEADER: Perfectly partitioned block view matching margins identically */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col md:flex-row items-center md:items-stretch justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
        
        {/* LEFT BLOCK: Company Details Workspace Panel Area */}
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800 p-2 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-inner shrink-0">
            <img src={InstituteLogo} alt="2231B0A7-6B93-4CCF-AAC6-14A13C40CF2F.JPG.jpeg" className="w-full h-full object-contain" />
          </div>
          <div className="text-center sm:text-left space-y-1 py-0.5">
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase leading-none">H.B.INSTITUTE</h1>
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">The Training Center</p>
            
            {/* Dynamic details packed exclusively under company blocks */}
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold space-y-0.5 pt-0.5">
              <p className="flex items-center justify-center sm:justify-start gap-1"><MapPin size={12} className="text-indigo-500" /> West Gate, A-221, 150 Ft. Ring Road, Raiya Road, Rajkot - 360007</p>
              <p className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3">
                <span className="flex items-center gap-1"><Phone size={12} className="text-indigo-500" /> +91 94844 33960</span>
                <span className="flex items-center gap-1"><Mail size={12} className="text-indigo-500" /> inquiry@hbinstitute.co.in</span>
                <span className="flex items-center gap-1"><Globe size={12} className="text-indigo-500" /> https://hbinstitute.co.in</span>
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: Balanced Student Portal Workspace (Flush with vertical margins) */}
        <div className="flex flex-col items-center md:items-end justify-between text-center md:text-right p-0.5 md:pl-6 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 shrink-0 min-w-[280px]">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-200/40 dark:border-indigo-500/20 uppercase tracking-widest inline-block">
              STUDENT PORTAL
            </span>
            <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white tracking-tight leading-tight pt-0.5">
              {studentProfile.name}
            </h2>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              ID: <span className="text-gray-600 dark:text-gray-300 font-black">{studentProfile.id.toUpperCase()}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 mt-4 md:mt-0">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${studentProfile.status === 'Active' ? 'bg-green-500/5 text-green-600 border-green-500/10' : 'bg-gray-100 text-gray-600'}`}>{studentProfile.status || 'Active'}</span>
            <button onClick={() => downloadStatementReceipt(studentProfile, feesRecords, metrics)} className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-500 rounded-xl transition-all border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"><Download size={12} /> Statement</button>
            {studentProfile.status === 'Completed' && (
              <button onClick={() => generateCertificate(studentProfile)} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm"><Award size={12} /> Certificate</button>
            )}
            <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"><LogOut size={12} /> Logout</button>
          </div>
        </div>
      </div>

      {/* 2. Master Metrics Grid Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-sm relative group overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><User size={14} className="text-gray-400" /> Student Matrix</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Mobile</p>
              <p className="font-semibold text-sm mt-0.5">{studentProfile.mobile || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Courses</p>
              <div className="flex flex-wrap gap-1">
                {studentProfile.courses && studentProfile.courses.length > 0 ? (
                  studentProfile.courses.map((course, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded font-bold text-[11px] uppercase tracking-wide">
                      {typeof course === 'object' ? course.name : course}
                    </span>
                  ))
                ) : (
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 uppercase">{studentProfile.course || "N/A"}</span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800/50 text-xs font-semibold">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Timing Batch</p>
              <p className="text-gray-600 dark:text-gray-300 mt-0.5 font-bold">{studentProfile.batchFrom && studentProfile.batchTo ? `${studentProfile.batchFrom} - ${studentProfile.batchTo}` : 'Flexible'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Joining</p>
              <p className="text-gray-600 dark:text-gray-300 mt-0.5 font-bold">
                {studentProfile.joiningDate?.seconds ? new Date(studentProfile.joiningDate.seconds * 1000).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
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

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><DollarSign size={14} className="text-emerald-500" /> Financial Statement</h3>
          <div className="space-y-1.5 text-xs">
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

      {/* 3. Chronological Lesson & Assignments Layout Workspace splits (8:4 layout columns out of 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-500">
        
        {/* LEFT COMPONENT: Classroom Update Timelines (8 Columns out of 12) */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
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
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/5 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase tracking-wide border border-indigo-500/10">
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
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 font medium text-sm bg-gray-50 dark:bg-gray-950">
              No dynamic classroom updates logged for your assigned tracks yet.
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: Assignments Workstation (4 Columns out of 12) */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <CheckSquare className="text-emerald-500" size={20} />
            <div>
              <h3 className="text-lg font-bold uppercase tracking-tight text-gray-900 dark:text-white">Active Assignments</h3>
              <p className="text-xs text-gray-500 font-medium">Tasks set specifically for your account</p>
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
                  <div key={task.id} className="bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wide border border-emerald-500/10">
                          {task.course}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          submissionStatus === 'Completed' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : isOverdue 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {submissionStatus === 'Completed' ? '✓ Done' : isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mt-2 tracking-tight">{task.title}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1 whitespace-pre-line leading-relaxed">{task.description}</p>

                      {/* Downloadable Reference File Attachment */}
                      {task.fileAttachment && (
                        <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 p-2 rounded-xl flex items-center justify-between shadow-xs">
                          <FileText className="text-indigo-500 shrink-0" size={14} />
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate tracking-tight max-w-[110px]">{task.fileAttachment.name}</span>
                          <a href={task.fileAttachment.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"><Download size={10}/> Get File</a>
                        </div>
                      )}
                    </div>

                    {/* Submission workspace areas toggle layout */}
                    <div className="pt-2.5 border-t border-gray-200/50 dark:border-gray-900 space-y-3">
                      {submissionStatus === 'Completed' ? (
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-green-500/10 space-y-1 shadow-xs text-[11px]">
                          <p className="text-[10px] text-green-500 font-black uppercase flex items-center gap-1"><CheckCircle2 size={11}/> Submitted: {detail?.turnedInAt}</p>
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
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Upload Supporting File Asset</label>
                            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                              <input type="file" id="student-upload" onChange={e => setSubmissionFile(e.target.files[0])} className="hidden" />
                              <label htmlFor="student-upload" className="cursor-pointer bg-white dark:bg-gray-900 border hover:bg-indigo-500 hover:text-white px-2.5 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all">Select</label>
                              <span className="text-[10px] text-gray-400 truncate max-w-[90px] font-semibold">{submissionFile ? submissionFile.name : "No file"}</span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 pt-1">
                            <button onClick={() => handleTurnInAssignment(task.id)} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black text-[9px] uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-1 disabled:bg-gray-400 transition-all shadow-sm">
                              {submitting ? <Loader2 className="animate-spin" size={10}/> : null} Submit
                            </button>
                            <button onClick={() => { setActiveSubmissionId(null); setSubmissionFile(null); setStudentNotes(''); }} className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[9px] font-black uppercase tracking-wider px-2.5 py-2 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dual-Date chronological context footer block */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-900 flex flex-col gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                      <div className="flex justify-between items-center">
                        <span className="truncate max-w-[110px] text-indigo-500">By: {task.facultyName}</span>
                        <span>Assigned: {task.givenDate ? task.givenDate.split('-').reverse().join('/') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="truncate max-w-[115px]">Slot: {task.batchSlot}</span>
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
              No assignments published.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default StudentPortal;