import React, { useState } from 'react';
import { X, User, Phone, Mail, Award, BookOpen, Plus, Image, Upload } from 'lucide-react';

const FacultyModal = ({ editingFaculty, closeFacultyModal, handleSaveFaculty, newFaculty, setNewFaculty }) => {
  const [subjectInput, setSubjectInput] = useState('');

  const addSubjectTag = (e) => {
    e.preventDefault();
    if (subjectInput.trim() !== '') {
      const currentSubjects = newFaculty.subjects || [];
      if (!currentSubjects.includes(subjectInput.trim())) {
        setNewFaculty({
          ...newFaculty,
          subjects: [...currentSubjects, subjectInput.trim()]
        });
      }
      setSubjectInput('');
    }
  };

  const removeSubjectTag = (subjectToRemove) => {
    setNewFaculty({
      ...newFaculty,
      subjects: (newFaculty.subjects || []).filter(sub => sub !== subjectToRemove)
    });
  };

  // Convert uploaded raw file into a manageable Base64 Data URL string
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB for optimized local database writes.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewFaculty({
        ...newFaculty,
        photoUrl: reader.result // Base64 data string
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">
              {editingFaculty ? 'Update Faculty Profile' : 'Add New Faculty'}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Faculty Directory Map</p>
          </div>
          <button onClick={closeFacultyModal} className="p-2.5 bg-gray-100 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSaveFaculty} className="p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          
          {/* File Upload Zone Component Block */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
              <Image size={12} /> Profile Picture
            </label>
            <div className="flex items-center gap-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              {newFaculty.photoUrl ? (
                <div className="relative group shrink-0">
                  <img 
                    src={newFaculty.photoUrl} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setNewFaculty({ ...newFaculty, photoUrl: '' })}
                    className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-sm"
                    title="Remove Photo"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                  <User size={24} />
                </div>
              )}
              
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl py-4 px-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-all group">
                <div className="flex items-center gap-2 text-indigo-500 group-hover:text-indigo-600 font-bold">
                  <Upload size={14} />
                  <span>Upload Image File</span>
                </div>
                <span className="text-[9px] text-gray-400 font-medium mt-1">PNG, JPG, or JPEG (Max 2MB)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><User size={12}/> Faculty Name</label>
              <input required className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500" value={newFaculty.name || ''} onChange={e => setNewFaculty({ ...newFaculty, name: e.target.value })} placeholder="e.g. Prof. Shyam Bhojak" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Phone size={12}/> Contact Mobile</label>
              <input required className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500" value={newFaculty.mobile || ''} onChange={e => setNewFaculty({ ...newFaculty, mobile: e.target.value })} placeholder="Mobile Number" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Mail size={12}/> Email Address</label>
              <input required type="email" className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500" value={newFaculty.email || ''} onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })} placeholder="name@hbinstitute.co.in" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Award size={12}/> Designation</label>
              <input required className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500" value={newFaculty.designation || ''} onChange={e => setNewFaculty({ ...newFaculty, designation: e.target.value })} placeholder="e.g. Professor / Founder" />
            </div>
          </div>

          {/* Dynamic Subject Tags Creator */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><BookOpen size={12}/> Allocate Subjects/Expertise</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3" 
                value={subjectInput} 
                onChange={e => setSubjectInput(e.target.value)} 
                placeholder="e.g. Python, C++, AI Engineering" 
              />
              <button type="button" onClick={addSubjectTag} className="px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl transition-all"><Plus size={16}/></button>
            </div>
            
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {newFaculty.subjects && newFaculty.subjects.map((sub) => (
                <span key={sub} className="flex items-center gap-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase">
                  {sub}
                  <X size={10} className="cursor-pointer hover:text-red-500 ml-1" onClick={() => removeSubjectTag(sub)} />
                </span>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all pt-3">
            {editingFaculty ? 'Save Profile Changes' : 'Commit Instructor Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FacultyModal;