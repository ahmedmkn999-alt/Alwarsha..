import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig'; // ⚠️ تأكد إننا استدعينا db
import { onAuthStateChanged } from "firebase/auth";
import { ref, update } from "firebase/database"; // ⚠️ وأدوات الكتابة في القاعدة
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // مراقب الدخول (الرادار)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // 1. حفظناه في حالة الموقع
        
        // 2. 🔥 الخطوة دي عشان يظهرلك في لوحة الأدمن فوراً 🔥
        // بنحدث بياناته في قاعدة البيانات (حتى لو مسجل من زمان)
        update(ref(db, `users/${currentUser.uid}`), {
            name: currentUser.displayName,
            email: currentUser.email,
            photo: currentUser.photoURL,
            id: currentUser.uid,
            lastSeen: new Date().toISOString() // عشان تعرف كان فاتح إمتى
        });

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // شاشة تحميل سريعة
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black text-yellow-400 font-black text-xl font-cairo" dir="rtl">
      جاري فتح الورشة... ⚡
    </div>
  );

  // لو مفيش مستخدم -> اعرض صفحة الدخول (Login.js)
  if (!user) {
    return <Login />;
  }

  // لو فيه مستخدم -> دخله الورشة (Dashboard.js)
  return <Dashboard user={user} />;
}
