import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, push } from "firebase/database";
import { useRouter } from 'next/router';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);

  const router = useRouter();
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com";
  const REQUIRED_USER = "ahmed"; 
  const REQUIRED_PASS = "0112838183800"; 

  useEffect(() => {
    const savedAuth = localStorage.getItem('alwarsha_admin_auth');
    if (savedAuth === 'true') setIsAdminAuthenticated(true);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setUser(currentUser);
        fetchData();
      } else {
        if (!loading) router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loading]);

  const fetchData = () => {
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(list.reverse());
    });
    onValue(ref(db, 'support'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setMessages(list.reverse());
    });
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400 font-black">جاري التحميل...</div>;

  if (user && !isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-yellow-400/20 w-full max-w-sm">
          <h2 className="text-xl font-black text-white mb-6 text-center">دخول إدارة الورشة 🔐</h2>
          <input type="text" placeholder="اسم المستخدم" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white mb-4 outline-none" onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" placeholder="كلمة السر" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white mb-4 outline-none" onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
          <button onClick={() => {
            if (loginForm.username === REQUIRED_USER && loginForm.password === REQUIRED_PASS) {
              setIsAdminAuthenticated(true);
              localStorage.setItem('alwarsha_admin_auth', 'true');
            } else alert("خطأ! ❌");
          }} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black">دخول</button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-cairo" dir="rtl">
      <h1 className="text-2xl font-black text-yellow-400 mb-8 italic">AL-WARSHA CONTROL</h1>
      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'products' ? 'bg-yellow-400 text-black' : 'bg-zinc-900'}`}>المنتجات ({products.length})</button>
        <button onClick={() => setActiveTab('messages')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'messages' ? 'bg-yellow-400 text-black' : 'bg-zinc-900'}`}>الدعم ({messages.length})</button>
      </div>
      {/* باقي محتوى اللوحة هنا... */}
    </div>
  );
}
