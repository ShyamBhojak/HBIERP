import React, { useState, useMemo } from 'react';
import { X, FileText, Calendar, BookOpen, User, Clock, CheckSquare, Loader2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { COURSES } from '../constants/options';

const AssignmentModal = ({ closeAssignmentModal, handleSaveAssignment, faculty, students }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState(COURSES[0]);
  
  // Dates configuration tracking inputs
  const [givenDate, setGivenDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [batchSlot, setBatchSlot] = useState(''); // Holds the unique dynamic string e.g., "04:00 PM - 05:00 PM"
  const [assignedStudentIds, setAssignedStudentIds] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // DYNAMICALLY GENERATE TIME SLOTS FROM ACTIVE STUDENTS
  const dynamicBatchSlots = useMemo(() => {
    const slots = (students || [])
      .filter(s => s.status === 'Active' && s.batchFrom && s.batchTo)
      .map(s => `${s.batchFrom} - ${s.batchTo}`);
    
    // Filter out duplicates to get a clean unique array list
    return [...new Set(slots)].sort();
  }, [students]);

  // Filter eligible student list dynamically mapping against the dynamic batch slot string layout
  const targetStudents = useMemo(() => {
    if (!course || !batchSlot) return [];
    
    return (students || []).filter(s => {
      const studentCourses = s.courses || (s.course ? [s.course] : []);
      const matchesCourse = studentCourses.includes(course);
      const studentCombinedSlot = `${s.batchFrom} - ${s.batchTo}`;
      
      return s.status === 'Active' && matchesCourse && studentCombinedSlot === batchSlot;
    });
  }, [students, course, batchSlot]);

  const handleConfigurationChange = (field, value) => {
    setAssignedStudentIds([]); // Clear the checkbox selection roster to maintain layout data safety
    if (field === 'course') setCourse(value);
    if (field === 'batchSlot') setBatchSlot(value);
  };

  const toggleStudentSelection = (studentId) => {
    setAssignedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllTargetStudents = () => {
    if (assignedStudentIds.length === targetStudents.length) {
      setAssignedStudentIds([]);
    } else {
      setAssignedStudentIds(targetStudents.map(s => s.id));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    const facultyMember = faculty.find(f => f.id === selectedFacultyId);
    if (!facultyMember) return alert("Please select a valid faculty instructor.");
    if (!batchSlot) return alert("Please select a targeted batch slot timing context.");
    if (assignedStudentIds.length === 0) return alert("Please select at least one student for this assignment.");

    setUploading(true);
    let fileAttachmentPayload = null;

    try {
      if (selectedFile) {
        const uniqueFileId = `${Date.now()}_` + selectedFile.name.replace(/\s+/g, '_');
        const storageRef = ref(storage, `assignments/${uniqueFileId}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        fileAttachmentPayload = {
          name: selectedFile.name,
          url: downloadUrl
        };
      }

      handleSaveAssignment({
        title,
        description,
        course,
        givenDate, 
        dueDate,
        batchSlot, 
        facultyId: facultyMember.id,
        facultyName: facultyMember.name,
        assignedStudentIds,
        fileAttachment: fileAttachmentPayload,
        submissions: assignedStudentIds.reduce((acc, id) => {
          acc[id] = 'Pending';
          return acc;
        }, {})
      });
    } catch (err) {
      console.error(err);
      alert("Failed to compile and attach file assets.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">Create New Assignment</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Academic Track System</p>
          </div>
          <button onClick={closeAssignmentModal} className="p-2.5 bg-gray-100 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <FileText size={12}/> Task Assignment Title
            </label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Practice Set 1 - Array Matrices" className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <User size={12}/> Assigning Faculty
              </label>
              <select required value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Select Instructor</option>
                {faculty && faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* DYNAMIC BATCH SLOT TIMING SELECTION DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Clock size={12}/> Targeted Batch Slot
              </label>
              <select required value={batchSlot} onChange={e => handleConfigurationChange('batchSlot', e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="">Select Active Batch Timings</option>
                {dynamicBatchSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <BookOpen size={12}/> Target Course
              </label>
              <select value={course} onChange={e => handleConfigurationChange('course', e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500">
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Calendar size={12}/> Task Given Date
              </label>
              <input required type="date" value={givenDate} onChange={e => setGivenDate(e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Calendar size={12}/> Submission Deadline
              </label>
              <input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Dynamic Checklist */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><CheckSquare size={12}/> Assign Students</label>
              {targetStudents.length > 0 && (
                <button type="button" onClick={selectAllTargetStudents} className="text-[9px] font-black text-indigo-500 uppercase tracking-wider hover:underline">
                  {assignedStudentIds.length === targetStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 max-h-32 overflow-y-auto space-y-2.5">
              {targetStudents.map(std => {
                const isChecked = assignedStudentIds.includes(std.id);
                return (
                  <label key={std.id} className="flex items-center gap-3 cursor-pointer group select-none">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleStudentSelection(std.id)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:bg-gray-900 focus:ring-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-indigo-500 transition-colors">{std.name}</span>
                    </div>
                  </label>
                );
              })}
              {targetStudents.length === 0 && (
                <p className="text-[10px] text-gray-400 italic font-medium text-center py-2">Select Course and Batch Slot to display eligible students.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Attach Materials / Guidelines Handout (Optional)</label>
            <div className="flex items-center gap-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <input type="file" id="assignment-file" onChange={e => setSelectedFile(e.target.files[0])} className="hidden" />
              <label htmlFor="assignment-file" className="cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-indigo-500 hover:text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border dark:border-gray-700">
                Choose File
              </label>
              <span className="text-xs text-gray-500 truncate max-w-xs font-semibold">
                {selectedFile ? selectedFile.name : "No attachment added"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assignment Guidelines</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Write guidelines or instructions here..." className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 outline-none h-16 resize-none font-semibold focus:ring-1 focus:ring-indigo-500" />
          </div>

          <button type="submit" disabled={uploading} className="w-full bg-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-white hover:bg-indigo-500 disabled:bg-gray-400 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Deploying Assets & Task...
              </>
            ) : "Deploy Assignment Task"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default AssignmentModal;