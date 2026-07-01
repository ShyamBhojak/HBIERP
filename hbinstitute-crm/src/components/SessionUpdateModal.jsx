import React, { useMemo } from 'react';
import { X, Calendar, Clock, User, BookOpen, MessageSquare, Users } from 'lucide-react';
import { COURSES } from '../constants/options';
import { sendPushNotification } from '../utils/adminNotification';

const SessionUpdateModal = ({ closeSessionModal, handleSaveSession, faculty, students, editingSession, currentSessionData, setCurrentSessionData }) => {

  // Calculate distinct batch slot options populated across your active student section
  const activeStudentBatchSlots = useMemo(() => {
    const slots = new Set();
    students.forEach(s => {
      if (s.status === 'Active' && s.batchFrom && s.batchTo) {
        slots.add(`${s.batchFrom} - ${s.batchTo}`);
      }
    });
    return ['Select Batch Time Slot', ...Array.from(slots)];
  }, [students]);

  // Dynamically filter active students who are in the SELECTED Course AND Batch Slot
  // REVISED: Search for course inclusion within the student's multi-course array
  const matchingStudentsList = useMemo(() => {
    if (!currentSessionData.course || !currentSessionData.batchSlot) return [];

    return students.filter(s => {
      // Fallback wrapper: Extract array elements safely regardless of document age
      const studentCourses = s.courses || (s.course ? [s.course] : []);
      const studentBatchSlot = `${s.batchFrom} - ${s.batchTo}`;

      return (
        s.status === 'Active' &&
        studentCourses.includes(currentSessionData.course) && // <-- FIX: Use includes instead of ===
        studentBatchSlot === currentSessionData.batchSlot
      );
    });
  }, [students, currentSessionData.course, currentSessionData.batchSlot]);
  // Safely format dates back into YYYY-MM-DD format for the native HTML date picker input
  const formattedInputDate = useMemo(() => {
    if (!currentSessionData.date) return new Date().toISOString().split('T')[0];

    // If date format is like "18 Jun 2026", convert it to YYYY-MM-DD
    if (isNaN(Date.parse(currentSessionData.date))) {
      const parts = currentSessionData.date.split(' ');
      if (parts.length === 3) {
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    return new Date(currentSessionData.date).toISOString().split('T')[0];
  }, [currentSessionData.date]);

  const toggleStudentSelection = (studentId, studentName) => {
    const currentIds = currentSessionData.assignedStudentIds || [];
    const currentNames = currentSessionData.assignedStudentNames || [];

    if (currentIds.includes(studentId)) {
      setCurrentSessionData({
        ...currentSessionData,
        assignedStudentIds: currentIds.filter(id => id !== studentId),
        assignedStudentNames: currentNames.filter(name => name !== studentName)
      });
    } else {
      setCurrentSessionData({
        ...currentSessionData,
        assignedStudentIds: [...currentIds, studentId],
        assignedStudentNames: [...currentNames, studentName]
      });
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!currentSessionData.facultyId) {
      alert("Please select the conducting faculty member.");
      return;
    }
    if (!currentSessionData.batchSlot) {
      alert("Please assign a valid running batch time slot.");
      return;
    }
    if (!currentSessionData.assignedStudentIds || currentSessionData.assignedStudentIds.length === 0) {
      alert("Please check at least one attending student for this session.");
      return;
    }

    const matchedFaculty = faculty.find(f => f.id === currentSessionData.facultyId);
    const facultyNameString = matchedFaculty ? matchedFaculty.name : 'Unknown Instructor';

    handleSaveSession({
      ...currentSessionData,
      facultyName: facultyNameString,
      date: new Date(formattedInputDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    // Loop through selected students to fire real-time push alerts cleanly
    currentSessionData.assignedStudentIds.forEach(studentId => {
      const studentProfile = students.find(s => s.id === studentId);
      if (studentProfile?.fcmToken) {
        sendPushNotification(
          studentProfile.fcmToken,
          "📖 Classroom Update Posted",
          `${facultyNameString} just logged a new session log details update for your ${currentSessionData.course || COURSES[0]} class.`
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">

        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">
              {editingSession ? 'Update Session Log' : 'Log Daily Classroom Update'}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Student-Wise Attendance Mapping</p>
          </div>
          <button onClick={closeSessionModal} className="p-2.5 bg-gray-100 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">

          {/* Faculty Selector (Binds to currentSessionData.facultyId) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><User size={12} /> Conducting Faculty / Teacher</label>
            <select
              value={currentSessionData.facultyId || ''}
              onChange={e => setCurrentSessionData({ ...currentSessionData, facultyId: e.target.value })}
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              required
            >
              <option value="">Choose Instructor</option>
              {faculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.designation})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Course Select (Binds to currentSessionData.course) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><BookOpen size={12} /> Syllabus Course Stream</label>
              <select
                value={currentSessionData.course || COURSES[0]}
                onChange={e => setCurrentSessionData({ ...currentSessionData, course: e.target.value, assignedStudentIds: [], assignedStudentNames: [] })}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Session Date (Binds to formattedInputDate) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Calendar size={12} /> Session Date</label>
              <input
                required
                type="date"
                value={formattedInputDate}
                onChange={e => setCurrentSessionData({ ...currentSessionData, date: e.target.value })}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Target Batch Timing Slot (Binds to currentSessionData.batchSlot) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Clock size={12} /> Target Batch Timing Slot</label>
            <select
              value={currentSessionData.batchSlot || ''}
              onChange={e => setCurrentSessionData({ ...currentSessionData, batchSlot: e.target.value, assignedStudentIds: [], assignedStudentNames: [] })}
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              required
            >
              <option value="" disabled>Choose Slot</option>
              {activeStudentBatchSlots.map((slot, i) => (
                <option key={i} value={slot.includes('Select') ? '' : slot} disabled={i === 0}>{slot}</option>
              ))}
            </select>
          </div>

          {/* Attending Students Checkbox Panel */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <Users size={12} /> Attending Students ({currentSessionData.assignedStudentIds?.length || 0} Selected)
            </label>
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 space-y-2 max-h-36 overflow-y-auto">
              {matchingStudentsList.map(student => {
                const isChecked = (currentSessionData.assignedStudentIds || []).includes(student.id);
                return (
                  <label key={student.id} className="flex items-center gap-3 cursor-pointer py-1 hover:bg-gray-50 dark:hover:bg-gray-900 px-1 rounded-md">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStudentSelection(student.id, student.name)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{student.name}</span>
                  </label>
                );
              })}
              {matchingStudentsList.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">Select a target Course and Batch Slot to see students.</p>
              )}
            </div>
          </div>

          {/* Topics Covered Box (Binds to currentSessionData.topicsCovered) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><MessageSquare size={12} /> Summary of Topics Covered</label>
            <textarea
              required
              value={currentSessionData.topicsCovered || ''}
              onChange={e => setCurrentSessionData({ ...currentSessionData, topicsCovered: e.target.value })}
              placeholder="e.g. Cleared array vectors..."
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 outline-none h-20 resize-none font-semibold focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all pt-3">
            {editingSession ? 'Save Log Changes' : 'Publish Class Update Log'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SessionUpdateModal;