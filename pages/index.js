import { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // الكود ده هيشتغل أول ما الموقع يفتح ويشوف هل المستخدم راجع من جوجل ولا لأ
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // لو سجل دخول، خزن بياناته
      } else {
        setUser(null);
      }
      setLoading(false); // وقف التحميل
    });

    return () => unsubscribe();
  }, []);

  // شاشة تحميل سريعة ولونها أسود عشان تمشي مع الثيم
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black text-primary font-bold text-xl">
      جاري التحميل... ⚡
    </div>
  );

  // لو مفيش مستخدم -> اظهر صفحة الدخول
  if (!user) {
    return <Login />;
  }

  // لو فيه مستخدم -> اظهر لوحة التحكم
  return <Dashboard user={user} />;
    }
