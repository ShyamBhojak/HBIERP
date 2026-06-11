/* global __initial_auth_token */
import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, deleteField, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithCustomToken, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { BookOpen, Menu, Sun, Moon, Download, Plus, Megaphone } from 'lucide-react';

import { auth, db, googleProvider, appId } from './config/firebase';
import { COURSES, PLATFORMS } from './constants/options';
import { getCurrentMonthYear, formatLongDate, exportToCSV } from './utils/helpers';

import Sidebar from './components/Sidebar';
import LeadModal from './components/LeadModal';
import StudentModal from './components/StudentModal';
import DashboardView from './views/DashboardView';
import InquiriesView from './views/InquiriesView';
import StudentsView from './views/StudentsView';
import AttendanceView from './views/AttendanceView';
import FeesView from './views/FeesView';
import ConvertLeadModal from './components/ConvertLeadModal';

const App = () => {
  const currentMonth = getCurrentMonthYear();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [studentViewMode, setStudentViewMode] = useState('grid');
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [courseFilter] = useState('All');
  const [globalMonth, setGlobalMonth] = useState(currentMonth);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [conversionLead, setConversionLead] = useState(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    e.preventDefault();
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [newLead, setNewLead] = useState({ name: '', course: COURSES[0], phone: '', priority: 'Medium', remarks: '', source: PLATFORMS[0] });
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', mobile: '', course: '', batchFrom: '', batchTo: '', joiningDate: '' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const leadsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    return onSnapshot(leadsCollection, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
        return {
          id: doc.id, ...data,
          date: formatLongDate(dateObj), day: dayName,
          month: dateObj.toLocaleString('default', { month: 'long', year: 'numeric' }),
          rawDate: dateObj
        };
      });
      setLeads(leadsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error(err));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const studentsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    return onSnapshot(studentsCollection, (snapshot) => {
      setStudents(snapshot.docs.map(doc => {
        const data = doc.data();
        const parseStatusDate = (dateStr) => {
          if (!dateStr) return null;
          let cleanStr = dateStr.replace(/\s+/g, ' ').replace(/,+/g, '');
          let parsed = new Date(cleanStr);
          if (!isNaN(parsed.getTime())) return parsed;
          cleanStr = cleanStr.replace(/-/g, ' ');
          parsed = new Date(cleanStr);
          return !isNaN(parsed.getTime()) ? parsed : null;
        };

        let month = '';
        if (data.statusHistory && data.status && data.statusHistory[data.status]) {
          const statusDate = parseStatusDate(data.statusHistory[data.status]);
          if (statusDate) month = statusDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        if (!month && data.joiningDate?.seconds) {
          const date = new Date(data.joiningDate.seconds * 1000);
          month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        return { id: doc.id, ...data, month };
      }));
    }, (err) => console.error(err));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const attendanceCollection = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    return onSnapshot(attendanceCollection, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    }, (err) => console.error(err));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const feesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'fees');
    return onSnapshot(feesCollection, (snapshot) => {
      setFees(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    }, (err) => console.error(err));
  }, [user]);

  const saveAttendance = async (dailyKey, payload) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', dailyKey);
      await updateDoc(docRef, payload).catch(async (err) => {
        if (err.code === 'not-found') {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(docRef, payload);
        } else {
          throw err;
        }
      });
    } catch (e) {
      console.error("Attendance writing matrix error:", e);
    }
  };

  const saveFeePayment = async (txId, payload) => {
    try {
      const { setDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'fees', txId);
      await setDoc(docRef, payload);
    } catch (e) {
      console.error("Fees transaction sync error:", e);
    }

  };
  const handleSaveLead = async (e) => {
    e.preventDefault();
    try {
      if (editingLead) {
        const pDoc = doc(db, 'artifacts', appId, 'public', 'data', 'leads', editingLead);
        await updateDoc(pDoc, { ...newLead });
      } else {
        const leadsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
        await addDoc(leadsCollection, { ...newLead, status: ['Inquiry'], createdAt: serverTimestamp(), userId: user.uid });
      }
      closeLeadModal();
    } catch (e) { console.error(e); }
  };

  const saveStudent = async () => {
    try {
      const studentsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'students');
      if (editingStudent) {
        const studentDoc = doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent);
        const existingStudent = students.find(s => s.id === editingStudent);
        const updates = { ...newStudent, joiningDate: Timestamp.fromDate(new Date(newStudent.joiningDate)) };

        if (existingStudent && existingStudent.status !== newStudent.status) {
          updates.statusUpdatedAt = serverTimestamp();
          updates.statusHistory = {
            ...(existingStudent.statusHistory || {}),
            [newStudent.status]: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          };
        }
        await updateDoc(studentDoc, updates);
      } else {
        await addDoc(studentsCollection, {
          ...newStudent, joiningDate: Timestamp.fromDate(new Date(newStudent.joiningDate)),
          createdAt: serverTimestamp(), status: newStudent.status || 'Active', statusUpdatedAt: serverTimestamp(),
          statusHistory: { [newStudent.status || 'Active']: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
        });
      }
      setShowStudentModal(false);
      setEditingStudent(null);
      setNewStudent({ name: '', mobile: '', course: '', batchFrom: '', batchTo: '', joiningDate: '', status: 'Active', totalFee: '', discount: '' });
    } catch (e) { console.error(e); }
  };

  const startEdit = (lead) => {
    setEditingLead(lead.id);
    setNewLead({ name: lead.name, course: lead.course, phone: lead.phone, priority: lead.priority, remarks: lead.remarks || '', source: lead.platform || lead.source });
    setIsAddingLead(true);
  };

  const closeLeadModal = () => {
    setIsAddingLead(false);
    setEditingLead(null);
    setNewLead({ name: '', course: COURSES[0], phone: '', priority: 'Medium', remarks: '', source: PLATFORMS[0] });
  };

  const editStudent = (student) => {
    setEditingStudent(student.id);
    setNewStudent({
      name: student.name || '', mobile: student.mobile || '', course: student.course || '', batchTo: student.batchTo || '', batchFrom: student.batchFrom || '', status: student.status || 'Active', totalFee: student.totalFee || '', discount: student.discount || '',
      joiningDate: student.joiningDate?.seconds ? new Date(student.joiningDate.seconds * 1000).toISOString().split('T')[0] : ''
    });
    setShowStudentModal(true);
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student record? This will reset their inquiry conversion status.')) return;

    try {
      const { deleteDoc, doc, updateDoc, deleteField } = await import('firebase/firestore');

      // 1. Find the target student object in your local state array to grab their leadId link
      const studentToRemoval = students.find(s => s.id === id);

      // 2. Execute the primary removal of the student document file
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id));

      // 3. SYNCHRONIZATION STEP: If this student came from a converted lead pipeline, patch the lead
      if (studentToRemoval && studentToRemoval.leadId) {
        const originalLead = leads.find(l => l.id === studentToRemoval.leadId);

        if (originalLead) {
          const currentStatuses = Array.isArray(originalLead.status) ? originalLead.status : [originalLead.status];

          // Cleanly filter out 'Converted' from the tracking array array list
          const restoredStatuses = currentStatuses.filter(st => st !== 'Converted');

          const leadDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', studentToRemoval.leadId);

          // Reset the lead states and clear out the execution timestamp map path
          await updateDoc(leadDocRef, {
            status: restoredStatuses,
            convertedAt: deleteField(),             // Wipes out conversion timestamp completely
            [`statusHistory.Converted`]: deleteField() // Strips out the history log tracker key path
          });
        }
      }

      alert("Student profile removed successfully. Inquiry conversion trigger has been reset!");
    } catch (e) {
      console.error("Critical Student Deletion Sync Failure Exception:", e);
      alert("Failed to sync status during deletion. Check dev console logs.");
    }
  };

  const convertToStudent = (lead) => {
    // Open the confirmation modal instead of pushing to database instantly
    setConversionLead(lead);
    setIsConvertModalOpen(true);
  };

  const handleExecuteConversion = async (additionalDetails) => {
    if (!conversionLead) return;

    try {
      const { setDoc, doc, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');

      const studentId = `student_${Date.now()}`;
      const parsedDate = new Date(additionalDetails.joiningDate);
      const targetMonth = parsedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      const cleanFee = String(additionalDetails.totalFee || '0').replace(/[^0-9]/g, '');
      const cleanDiscount = String(additionalDetails.discount || '0').replace(/[^0-9]/g, '');

      // 1. Compile the student registration profile payload
      const studentPayload = {
        id: studentId,
        leadId: String(conversionLead.id),
        name: String(conversionLead.name),
        mobile: String(conversionLead.mobile),
        course: String(conversionLead.course || 'N/A'),
        status: 'Active',
        month: String(targetMonth),
        totalFee: Number(cleanFee) || 0,
        discount: Number(cleanDiscount) || 0,
        batchFrom: String(additionalDetails.batchFrom || 'Not Assigned'),
        batchTo: String(additionalDetails.batchTo || 'Not Assigned'),
        joiningDate: Timestamp.fromDate(parsedDate),
        createdAt: serverTimestamp(),
        statusHistory: {
          Active: parsedDate.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          }) + ' at 00:00:00 UTC'
        }
      };

      // 2. Write the new student file tracking document
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), studentPayload);

      // 3. FIX: Read your current array list structure safely
      const currentStatuses = Array.isArray(conversionLead.status) ? conversionLead.status : [conversionLead.status];

      // Prevent duplicate appending if the user clicks convert multiple times
      const updatedStatuses = currentStatuses.includes('Converted')
        ? currentStatuses
        : [...currentStatuses, 'Converted'];

      const logDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

      // 4. Update the existing lead document cleanly without erasing other statuses
      const leadDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', conversionLead.id);
      await updateDoc(leadDocRef, {
        status: updatedStatuses,
        convertedAt: serverTimestamp(),
        [`statusHistory.Converted`]: logDate // Write execution timestamp history directly to history map log
      });

      alert(`Success! ${conversionLead.name} converted to an active enrolled student.`);
      setIsConvertModalOpen(false);
      setConversionLead(null);
    } catch (e) {
      console.error("Critical Firestore Pipeline Exception Log:", e);
      alert("Conversion pipeline write failed. Check dev logs.");
    }
  };

  const deleteLead = async (id) => {
    if (window.confirm("Are you sure you want to delete this inquiry?")) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id)); } catch (e) { console.error(e); }
    }
  };

const updateLeadStatus = async (leadId, currentStatuses = [], clickedStatus) => {
    try {
      const statusArray = Array.isArray(currentStatuses) ? currentStatuses : [currentStatuses];
      let updatedStatuses;
      const updates = {};
      const logDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

      if (statusArray.includes(clickedStatus)) {
        // 1. If clicking a status that is ALREADY active, remove it
        updatedStatuses = statusArray.filter(st => st !== clickedStatus);
        updates[`statusHistory.${clickedStatus}`] = deleteField();

        // Safety synchronization: If manually removing 'Enrolled', also strip 'Converted' tags
        if (clickedStatus === 'Enrolled') {
          updatedStatuses = updatedStatuses.filter(st => st !== 'Converted');
          updates[`statusHistory.Converted`] = deleteField();
          updates.convertedAt = deleteField();
        }
      } else {
        // 2. If activating a NEW status badge
        updatedStatuses = [...statusArray, clickedStatus];
        updates[`statusHistory.${clickedStatus}`] = logDate;

        // FIX: If re-activating 'Enrolled' for an inquiry that isn't currently converted,
        // force-clear any old leftover historical 'Converted' keys from previous deleted records.
        if (clickedStatus === 'Enrolled' && !statusArray.includes('Converted')) {
          updates[`statusHistory.Converted`] = deleteField();
          updates.convertedAt = deleteField();
        }
      }
      
      updates.status = updatedStatuses;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), updates);
    } catch (e) { 
      console.error("Inquiry status history patch sync exception:", e); 
    }
  };  

  const updateLeadRemarks = async (leadId, val) => {
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { remarks: val }); } catch (e) { console.error(e); }
  };

  const toggleStatusFilter = (status) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone?.includes(searchQuery) || l.course?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = globalMonth === 'All' || l.month === globalMonth;
      const leadStatusArray = Array.isArray(l.status) ? l.status : [l.status];

      // REVISED FILTER LOGIC: If no specific filter button row is active, show everything.
      // If a filter button is clicked, match that specific status option properly.
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.some(s => leadStatusArray.includes(s));
      const matchesCourse = courseFilter === 'All' || l.course === courseFilter;

      return matchesSearch && matchesMonth && matchesStatus && matchesCourse;
    });
  }, [leads, searchQuery, globalMonth, selectedStatuses, courseFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const search = studentSearch.toLowerCase();
      const matchesSearch = student.name?.toLowerCase().includes(search) || student.mobile?.toLowerCase().includes(search) || student.course?.toLowerCase().includes(search) || student.batchFrom?.toLowerCase().includes(search) || student.batchTo?.toLowerCase().includes(search) || student.status?.toLowerCase().includes(search);
      const matchesStudentMonth = globalMonth === 'All' ? true : student.month === globalMonth;
      const matchesStatus = selectedStatus === '' ? true : student.status === selectedStatus;
      return matchesSearch && matchesStudentMonth && matchesStatus;
    });
  }, [students, studentSearch, globalMonth, selectedStatus]);

  const studentsTimelineEvents = useMemo(() => {
    const events = [];
    filteredStudents.forEach((student) => {
      // 1. Inquiry Generation Event (Base of the timeline)
      if (student.leadId) {
        // We find the original lead to get the inquiry date
        const originalLead = leads.find(l => l.id === student.leadId);
        const inquiryDate = originalLead?.rawDate || (student.createdAt?.toDate ? student.createdAt.toDate() : null);

        if (inquiryDate) {
          events.push({
            id: `${student.id}-inquiry`,
            studentId: student.id,
            studentName: student.name,
            course: student.course,
            mobile: student.mobile,
            type: 'Inquiry Generated',
            date: inquiryDate,
            dateStr: inquiryDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            color: 'bg-orange-500' // Distinct color for initial inquiry
          });
        }
      }

      // 2. Enrollment / Joining Event
      if (student.joiningDate?.seconds) {
        const jDate = new Date(student.joiningDate.seconds * 1000);
        events.push({
          id: `${student.id}-join`,
          studentId: student.id,
          studentName: student.name,
          course: student.course,
          mobile: student.mobile,
          type: 'Enrolled / Joined',
          date: jDate,
          dateStr: jDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          color: 'bg-green-500'
        });
      }

      // 3. Status History Updates (Follow-ups, Completion, etc.)
      if (student.statusHistory) {
        Object.entries(student.statusHistory).forEach(([status, rawDateStr]) => {
          let eventDate = new Date();
          if (rawDateStr) {
            let cleanStr = rawDateStr.replace(/\s+/g, ' ').replace(/,+/g, '');
            let parsed = new Date(cleanStr);
            if (!isNaN(parsed.getTime())) eventDate = parsed;
            else {
              cleanStr = cleanStr.replace(/-/g, ' ');
              parsed = new Date(cleanStr);
              if (!isNaN(parsed.getTime())) eventDate = parsed;
            }
          }

          let color = status === 'Active' ? 'bg-green-500' :
            status === 'Completed' ? 'bg-blue-500' :
              status === 'Dropped' ? 'bg-red-500' :
                status === 'Placed' ? 'bg-purple-500' : 'bg-gray-500';

          // Only add if it's not the exact same as enrollment to avoid duplicate dots
          events.push({
            id: `${student.id}-${status}`,
            studentId: student.id,
            studentName: student.name,
            course: student.course,
            mobile: student.mobile,
            type: `Status: ${status}`,
            date: eventDate,
            dateStr: rawDateStr,
            color
          });
        });
      }
    });

    // Sort all events globally so inquiry shows at the bottom (oldest) and updates at top (newest)
    return events.sort((a, b) => b.date - a.date);
  }, [filteredStudents, leads]); // Added leads to dependencies

  const monthOptions = useMemo(() => ['All', ...new Set(leads.map(l => l.month))], [leads]);
  const studentMonthOptions = useMemo(() => ['All', ...new Set(students.map(s => s.month).filter(Boolean))], [students]);

  const stats = useMemo(() => {
    const filteredForStats = leads.filter(l => globalMonth === 'All' || l.month === globalMonth);
    const getStatusArray = (lead) => Array.isArray(lead.status) ? lead.status : [lead.status];
    return {
      total: filteredForStats.length,
      enrolled: filteredForStats.filter(l => getStatusArray(l).includes('Enrolled')).length,
      visited: filteredForStats.filter(l => getStatusArray(l).includes('Visited')).length,
      closed: filteredForStats.filter(l => getStatusArray(l).includes('Closed')).length,
      conversion: filteredForStats.length ? ((filteredForStats.filter(l => getStatusArray(l).includes('Enrolled')).length / filteredForStats.length) * 100).toFixed(1) : 0
    };
  }, [leads, globalMonth]);

  const handleExport = () => {
    if (activeTab === 'leads') exportToCSV(filteredLeads, 'HB_Inquiries');
    else if (activeTab === 'students') exportToCSV(filteredStudents, 'HB_Students');
    else alert("Nothing to export.");
  };

  if (authLoading) return <div className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-indigo-500 font-bold">Initializing CRM...</div>;

  if (!user) return (
    <div className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-10 text-center bg-gradient-to-br from-indigo-600 to-indigo-800">
          <BookOpen className="text-white mx-auto mb-4" size={56} />
          <h1 className="text-2xl font-bold text-white tracking-tight">H.B.INSTITUTE - THE TRAINING CENTER CRM</h1>
          <p className="text-indigo-100 text-sm mt-1 opacity-80 uppercase tracking-widest font-semibold">Admin Gateway</p>
        </div>
        <div className="p-10 space-y-6 text-center">
          <p className="text-gray-400 text-sm">Please sign in with your Institute Google Account to manage leads and inquiries.</p>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <aside className={`hidden md:flex flex-col h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} />
      </aside>

      <div className={`fixed inset-0 z-50 bg-black/80 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}>
        <aside className={`w-72 h-screen flex flex-col bg-white dark:bg-gray-950 transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} />
        </aside>
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 border-b flex items-center justify-between px-6 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-gray-400" onClick={() => setIsMobileMenuOpen(true)}><Menu /></button>
            <h2 className="text-xl font-black uppercase tracking-widest">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
            {['leads', 'students'].includes(activeTab) && (
              <>
                <button onClick={handleExport} className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-700 transition-colors"><Download size={16} />Export</button>
                <button onClick={() => activeTab === 'leads' ? setIsAddingLead(true) : setShowStudentModal(true)} className={`${activeTab === 'leads' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-green-600 hover:bg-green-500'} p-3 sm:px-6 sm:py-2.5 rounded-xl flex items-center gap-2`}><Plus size={20} /><span className="hidden sm:inline font-bold text-sm">{activeTab === 'leads' ? 'New Inquiry' : 'Add Student'}</span></button>
              </>
            )}
            <button onClick={toggleTheme} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <DashboardView stats={stats} globalMonth={globalMonth} setGlobalMonth={setGlobalMonth} monthOptions={monthOptions} students={students} setSelectedStatuses={setSelectedStatuses} setActiveTab={setActiveTab} setSelectedStatus={setSelectedStatus} />}
          {activeTab === 'leads' && <InquiriesView searchQuery={searchQuery} setSearchQuery={setSearchQuery} globalMonth={globalMonth} setGlobalMonth={setGlobalMonth} monthOptions={monthOptions} selectedStatuses={selectedStatuses} toggleStatusFilter={toggleStatusFilter} filteredLeads={filteredLeads} startEdit={startEdit} deleteLead={deleteLead} convertToStudent={convertToStudent} updateLeadStatus={updateLeadStatus} updateLeadRemarks={updateLeadRemarks} />}
          {activeTab === 'students' && <StudentsView studentSearch={studentSearch} setStudentSearch={setStudentSearch} globalMonth={globalMonth} setGlobalMonth={setGlobalMonth} studentMonthOptions={studentMonthOptions} studentViewMode={studentViewMode} setStudentViewMode={setStudentViewMode} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} filteredStudents={filteredStudents} studentsTimelineEvents={studentsTimelineEvents} editStudent={editStudent} deleteStudent={deleteStudent} students={students} leads={leads} attendanceRecords={attendance} feesRecords={fees} />}
          {activeTab === 'attendance' && <AttendanceView students={students} attendanceRecords={attendance} saveAttendance={saveAttendance} />}
          {activeTab === 'fees' && <FeesView students={students} feesRecords={fees} saveFeePayment={saveFeePayment} globalMonth={globalMonth} />}
          {activeTab === 'social' && (
            <div className="max-w-3xl mx-auto py-10">
              <div className="bg-indigo-600 p-12 rounded-[3.5rem] text-center mb-8 relative overflow-hidden">
                <Megaphone size={56} className="mx-auto mb-6" />
                <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-white">Social Hub</h2>
                <p className="text-indigo-100 font-bold uppercase tracking-[0.3em] text-[10px]">Canva Content & Post Context</p>
              </div>
              <div className="grid gap-6">
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-[2.5rem]">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Post Idea of the Day</h3>
                  <div className="p-6 bg-white dark:bg-gray-950 rounded-2xl border-l-4 border-indigo-600 border border-gray-200 dark:border-gray-800">
                    <p className="text-gray-300 leading-relaxed font-medium">"Struggling with complex code? 💻 At H.B.INSTITUTE, we turn theory into technology. Join our dynamic batches starting this Monday! 🚀 #HBInstitute #RajkotTech"</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isAddingLead && <LeadModal editingLead={editingLead} closeLeadModal={closeLeadModal} handleSaveLead={handleSaveLead} newLead={newLead} setNewLead={setNewLead} />}
      {showStudentModal && <StudentModal editingStudent={editingStudent} setShowStudentModal={setShowStudentModal} setEditingStudent={setEditingStudent} newStudent={newStudent} setNewStudent={setNewStudent} saveStudent={saveStudent} />}
      {/* Target rendering injection overlays hooks inside App.js */}
      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => { setIsConvertModalOpen(false); setConversionLead(null); }}
        lead={conversionLead}
        onConfirm={handleExecuteConversion}
      />
    </div>
  );
};

export default App;