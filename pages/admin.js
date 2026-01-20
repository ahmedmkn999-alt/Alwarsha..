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
  const [replyText, setReplyText] = useState({});

  const router = useRouter();
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com";
  const REQUIRED_USER = "ahmed"; // الاسم المطلوب
  const REQUIRED_PASS = "0112838183800"; // كلمة السر المطلوبة

  useEffect(() => {
    // 1. التحقق من وجود جلسة دخول سابقة في المتصفح
    const savedAuth = localStorage.getItem('volt_admin_auth');
    if (savedAuth === 'true') {
      setIsAdminAuthenticated(true);
    }

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

  const checkAdminLogin = () => {
    if (loginForm.username === REQUIRED_USER && loginForm.password === REQUIRED_PASS) {
      setIsAdminAuthenticated(true);
      // حفظ الدخول في المتصفح عشان ميسألش تاني
      localStorage.setItem('volt_admin_auth', 'true');
    } else {
      alert("الاسم أو كلمة السر خطأ! ❌");
    }
  };

  const deleteItem = async (path, id) => {
    if (confirm("⚠️ حذف نهائي من الموقع؟")) {
      await remove(ref(db, `${path}/${id}`));
      alert("تم الحذف ✅");
    }
  };

  const handleReply = (msgId, userId, userName) => {
    const text = replyText[msgId];
    if (!text) return alert("اكتب الرد أولاً");
    push(ref(db, `messages/${userId}`), {
      fromName: 'Admin',
      text: `رد الإدارة: ${text}`,
      date: new Date().toISOString()
    });
    setReplyText({ ...replyText, [msgId]: '' });
    alert(`تم الرد على ${userName} ✅`);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400 font-black">جاري التحقق...</div>;

  // شاشة تسجيل الدخول بالاسم والباسورد (تظهر فقط لو مش محفوظين)
  if (user && !isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 font-cairo">
        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-yellow-400/20 w-full max-w-sm shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6 text-center">بوابة الإدارة 🔐</h2>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="اسم المستخدم"
              className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white outline-none focus:border-yellow-400"
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
            />
            <input 
              type="password" 
              placeholder="كلمة السر"
              className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white outline-none focus:border-yellow-400"
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
            />
            <button 
              onClick={checkAdminLogin}
              className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black hover:scale-105 transition-all mt-4"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 font-cairo" dir="rtl">
      {/* هيدر لوحة التحكم */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-yellow-400 italic tracking-tighter">VOLT CONTROL</h1>
          <p className="text-zinc-500 text-sm font-bold">مرحباً أحمد، لديك صلاحيات الحذف والرد الكاملة.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { localStorage.removeItem('volt_admin_auth'); window.location.reload(); }}
            className="px-4 py-2 bg-red-900/20 text-red-500 rounded-xl text-xs font-bold border border-red-900/30"
          >
            قفل اللوحة 🔒
          </button>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all text-xs font-bold">الرئيسية 🏠</button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('products')} className={`px-8 py-3 rounded-2xl font-black transition-all ${activeTab === 'products' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-zinc-900 text-zinc-500'}`}>المنتجات ({products.length})</button>
        <button onClick={() => setActiveTab('messages')} className={`px-8 py-3 rounded-2xl font-black transition-all ${activeTab === 'messages' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-zinc-900 text-zinc-500'}`}>الرسايل ({messages.length})</button>
      </div>

      <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl">
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right font-bold text-sm">
              <thead className="bg-black text-zinc-500 text-[10px] uppercase">
                <tr>
                  <th className="p-6">المنتج</th>
                  <th className="p-6">السعر</th>
                  <th className="p-4">البائع</th>
                  <th className="p-6 text-center">تحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-black/40 transition-colors">
                    <td className="p-6 flex items-center gap-4">
                      <img src={p.image} className="w-12 h-12 rounded-lg object-cover border border-zinc-700 shadow-md" />
                      <span>{p.name}</span>
                    </td>
                    <td className="p-6 text-yellow-400">{p.price} ج.م</td>
                    <td className="p-6 text-xs font-normal">
                       <span className="block font-black text-zinc-300">{p.sellerName}</span>
                       <span className="text-zinc-600">{p.phone}</span>
                    </td>
                    <td className="p-6 text-center">
                      <button onClick={() => deleteItem('products', p.id)} className="text-red-500 hover:underline">حذف 🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="p-6 space-y-4">
            {messages.length === 0 && <p className="text-center py-10 opacity-30 italic">لا توجد رسائل دعم</p>}
            {messages.map(msg => (
              <div key={msg.id} className="bg-black p-6 rounded-3xl border border-zinc-800 shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-yellow-400 text-sm">{msg.userName}</span>
                  <button onClick={() => deleteItem('support', msg.id)} className="text-[10px] text-zinc-600">حذف الشكوى</button>
                </div>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">"{msg.msg}"</p>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs outline-none focus:border-yellow-400"
                    placeholder="اكتب ردك هنا..."
                    value={replyText[msg.id] || ''}
                    onChange={(e) => setReplyText({...replyText, [msg.id]: e.target.value})}
                  />
                  <button onClick={() => handleReply(msg.id, msg.userId, msg.userName)} className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-black text-xs">إرسال</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
