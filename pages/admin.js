import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove } from "firebase/database";
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
    // جلب المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(list.reverse());
    });
    // جلب رسائل الدعم
    onValue(ref(db, 'support'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setMessages(list.reverse());
    });
  };

  const deleteItem = async (path, id) => {
    if (confirm("⚠️ هل أنت متأكد من حذف هذا العنصر نهائياً من الورشة؟")) {
      await remove(ref(db, `${path}/${id}`));
      alert("تم الحذف بنجاح ✅");
    }
  };

  const handleLogoutAdmin = () => {
    localStorage.removeItem('alwarsha_admin_auth');
    setIsAdminAuthenticated(false);
    window.location.reload();
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400 font-black italic animate-pulse">جاري فتح لوحة الورشة...</div>;

  // شاشة تسجيل الدخول الإضافية للأدمن
  if (user && !isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 font-cairo text-right" dir="rtl">
        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-yellow-400/20 w-full max-w-sm shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-2 text-center">دخول الإدارة 🔐</h2>
          <p className="text-zinc-500 text-xs text-center mb-8">يجب إدخال بيانات الوصول السرية للورشة</p>
          <div className="space-y-4">
            <input type="text" placeholder="اسم المستخدم" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white outline-none focus:border-yellow-400 transition-all font-bold" onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="كلمة السر" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white outline-none focus:border-yellow-400 transition-all font-bold" onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
            <button onClick={() => {
              if (loginForm.username === REQUIRED_USER && loginForm.password === REQUIRED_PASS) {
                setIsAdminAuthenticated(true);
                localStorage.setItem('alwarsha_admin_auth', 'true');
              } else alert("بيانات الدخول غير صحيحة ❌");
            }} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-lg hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/10">دخول اللوحة</button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-10 font-cairo text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-zinc-900 pb-8">
        <div>
           <h1 className="text-3xl font-black text-yellow-400 italic mb-2 tracking-tighter">AL-WARSHA CONTROL</h1>
           <p className="text-zinc-500 text-xs font-bold">مرحباً بك يا مدير الورشة في لوحة التحكم المركزية</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-zinc-900 rounded-xl text-xs font-black border border-zinc-800 hover:bg-zinc-800">الرئيسية 🏠</button>
          <button onClick={handleLogoutAdmin} className="px-6 py-2 bg-red-950/30 text-red-500 rounded-xl text-xs font-black border border-red-900/30 hover:bg-red-900/40">خروج 🛑</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
        <button onClick={() => setActiveTab('products')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
          📦 المنتجات المعروضة ({products.length})
        </button>
        <button onClick={() => setActiveTab('messages')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
          🎧 طلبات الدعم ({messages.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl animate-fadeIn">
        
        {/* جدول المنتجات */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-black/50 text-zinc-500 text-xs font-black uppercase">
                <tr>
                  <th className="p-6">الجهاز</th>
                  <th className="p-6">السعر</th>
                  <th className="p-6">القسم</th>
                  <th className="p-6">البائع</th>
                  <th className="p-6 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {products.length === 0 ? (
                  <tr><td colSpan="5" className="p-20 text-center text-zinc-600 italic">لا توجد أجهزة معروضة في الورشة حالياً..</td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="hover:bg-black/20 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <img src={p.image} className="w-14 h-14 rounded-2xl object-cover border border-zinc-800 shadow-sm" alt={p.name} />
                          <span className="font-black text-sm">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-6 text-yellow-400 font-black">{p.price} ج.م</td>
                      <td className="p-6"><span className="bg-zinc-800 px-3 py-1 rounded-lg text-[10px] font-bold">{p.category}</span></td>
                      <td className="p-6 text-zinc-400 text-xs">{p.sellerName}</td>
                      <td className="p-6 text-center">
                        <button onClick={() => deleteItem('products', p.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* قائمة الدعم */}
        {activeTab === 'messages' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.length === 0 ? (
              <div className="col-span-full py-20 text-center text-zinc-600 italic">لا توجد رسائل دعم فني حالياً..</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="bg-black/40 p-6 rounded-3xl border border-zinc-800 flex flex-col justify-between hover:border-yellow-400/50 transition-all group">
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-black text-yellow-400 text-sm">{msg.userName}</span>
                       <span className="text-[9px] text-zinc-600 font-bold">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed font-bold">{msg.msg}</p>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                    <a href={`mailto:${msg.userId}`} className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors">مراسلة 📩</a>
                    <button onClick={() => deleteItem('support', msg.id)} className="text-[10px] font-black text-red-500 hover:text-red-400 transition-colors">حذف الرسالة 🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      <p className="text-center mt-12 text-[10px] text-zinc-700 font-black tracking-widest uppercase italic">نظام إدارة الورشة المتكامل • 2026</p>
    </div>
  );
}
