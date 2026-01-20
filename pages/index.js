import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-primary text-2xl font-bold">
      جاري تحميل الورشة...
    </div>
  );

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Dashboard user={user} />;
}
  
