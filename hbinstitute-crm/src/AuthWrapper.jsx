import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider, appId } from './config/firebase';
import { BookOpen } from 'lucide-react';
import App from './App';
import StudentPortal from './views/StudentPortal';
import { ALLOWED_EMAILS } from './constants/options';

const AuthWrapper = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'student' | 'unauthorized'
  const [studentData, setStudentData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setAuthLoading(true);
      if (u) {
        if (ALLOWED_EMAILS.includes(u.email)) {
          setRole('admin');
          setUser(u);
          setAuthLoading(false);
        } else {
          try {
            const studentQuery = query(
              collection(db, 'artifacts', appId, 'public', 'data', 'students'),
              where('email', '==', u.email)
            );
            const querySnapshot = await getDocs(studentQuery);

            if (!querySnapshot.empty) {
              const profile = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
              setStudentData(profile);
              setUser(u);
              setRole('student');
            } else {
              setRole('unauthorized');
              setUser(null);
              alert("Access Denied: This email is not registered in the system.");
            }
          } catch (err) {
            console.error("Firestore authentication failure:", err);
            setRole('unauthorized');
          } finally {
            setAuthLoading(false);
          }
        }
      } else {
        setUser(null);
        setRole(null);
        setStudentData(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return <div className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center font-bold text-indigo-500">Checking credentials...</div>;
  }

  // Your actual beautiful, inline Google Sign-In layout screen instead of a placeholder
  if (!user) {
    // return (
    //   <div className="h-screen bg-black/95 flex items-center justify-center p-4">
    //     <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-[3rem] p-8 shadow-2xl text-center">
    //       <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
    //         <BookOpen className="text-indigo-500" size={32} />
    //       </div>
    //       <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">H.B.INSTITUTE ERP</h3>
    //       <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 mb-8">Portal Gatekeeper</p>
    //       <button
    //         onClick={() => signInWithPopup(auth, googleProvider)}
    //         className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-all border shadow-sm"
    //       >
    //         <span>Sign in with Google Account</span>
    //       </button>
    //     </div>
    //   </div>
    // );
    if (!user) return (
      <div className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-10 text-center bg-gradient-to-br from-indigo-600 to-indigo-800">
            <BookOpen className="text-white mx-auto mb-4" size={56} />
            <h1 className="text-2xl font-bold text-white tracking-tight">H.B.INSTITUTE - THE TRAINING CENTER</h1>
            <p className="text-indigo-100 text-sm mt-1 opacity-80 uppercase tracking-widest font-semibold">Portal Gateway</p>
          </div>
          <div className="p-10 space-y-6 text-center">
            {/* <p className="text-gray-400 text-sm">Please sign in with your Institute Google Account to manage leads and inquiries.</p> */}
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
  }

  if (role === 'admin') return <App />;
  if (role === 'student') return <StudentPortal user={user} studentProfileProp={studentData} />;
  return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Unauthorized Access</div>;
};

export default AuthWrapper;