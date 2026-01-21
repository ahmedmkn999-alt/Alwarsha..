import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig'; // اتأكد إن المسار صح حسب ملفاتك
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, push, update } from "firebase/database";
import { useRouter } from 'next/router';

export default function AdminPanel() {
  // --- المصادقة والحالة ---
  const [user, setUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  
  // --- التبويبات والبيانات ---
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]); // رسائل الدعم
  const [allUsers, setAllUsers] = useState([]); // قائمة المستخدمين
  const [reports, setReports] = useState([]); // البلاغات

  // --- الشات والردود ---
  const [chatModal, setChatModal] = useState({ show: false, userId: '', userName: '' });
  const [replyText, setReplyText] = useState('');
  const [userChatHistory, setUserChatHistory] = useState([]);

  const router = useRouter();
  
  // --- بيانات الدخول السرية ---
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com"; // إيميلك في فايربيس
  const REQUIRED_USER = "ahmed"; 
  const REQUIRED_PASS = "0112838183800"; 

  useEffect(() => {
    // التحقق من تسجيل الدخول السابق
    const savedAuth = localStorage.getItem('alwarsha_admin_auth');
    if (savedAuth === 'true') setIsAdminAuthenticated(true);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // السماح بالدخول لو الإيميل مطابق لإيميل الأدمن
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setUser(currentUser);
        fetchData();
      } else {
        // لو مش مسجل دخول، متعملش حاجة خليه يكتب الباسورد
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = () => {
    // 1. المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(list.reverse());
    });
    // 2. رسائل الدعم
    onValue(ref(db, 'support'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setMessages(list.reverse());
    });
    // 3. المستخدمين (عشان الحظر)
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setAllUsers(list);
    });
    // 4. البلاغات
    onValue(ref(db, 'reports'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setReports(list.reverse());
    });
  };

  // متابعة الشات المفتوح حالياً
  useEffect(() => {
    if (chatModal.show && chatModal.userId) {
      // بنجيب الرسايل الخاصة بالمستخدم ده بس
      const chatRef = ref(db, `messages/${chatModal.userId}`);
      onValue(chatRef, (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        // ترتيب بالوقت
        setUserChatHistory(list.sort((a,b) => new Date(a.date) - new Date(b.date)));
      });
    }
  }, [chatModal]);

  // دالة الحذف العامة
  const deleteItem = async (path, id) => {
    if (confirm("⚠️ هل أنت متأكد من الحذف النهائي؟")) {
      await remove(ref(db, `${path}/${id}`));
      alert("تم الحذف بنجاح ✅");
    }
  };

  // دالة الحظر (Ban)
  const toggleBan = (targetId, currentStatus) => {
    if (confirm(currentStatus ? "فك الحظر عن المستخدم؟" : "حظر هذا المستخدم نهائياً؟ 🚫")) {
       update(ref(db, `users/${targetId}`), { banned: !currentStatus });
    }
  };

  // إرسال رد للمستخدم
  const sendReply = () => {
    if (!replyText.trim()) return;
    const msgData = {
      fromName: "إدارة الورشة ⚡",
      fromId: "Admin", // مهم جداً عشان يظهر بلون مختلف عند المستخدم
      text: replyText,
      date: new Date().toISOString()
    };
    
    // 1. نحط الرسالة في صندوق المستخدم
    push(ref(db, `messages/${chatModal.userId}`), msgData);
    // 2. نحط نسخة في صندوق الأدمن (اختياري بس مفيد للتنظيم)
    push(ref(db, `messages/Admin`), { ...msgData, toId: chatModal.userId });

    setReplyText('');
  };

  // --- واجهة تسجيل الدخول (لو مش مسجل) ---
  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400 font-black animate-pulse">جاري تحميل النظام...</div>;

  if (!isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-yellow-400/20 w-full max-w-sm shadow-[0_0_40px_rgba(255,215,0,0.1)]">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white"><span className="text-black text-3xl font-black italic">W</span></div>
          </div>
          <h2 className="text-xl font-black text-white mb-6 text-center">دخول غرفة التحكم 🔐</h2>
          <input type="text" placeholder="اسم القائد" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white mb-4 outline-none focus:border-yellow-400" onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" placeholder="الكود السري" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white mb-4 outline-none focus:border-yellow-400" onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
          <button onClick={() => {
            if (loginForm.username === REQUIRED_USER && loginForm.password === REQUIRED_PASS) {
              setIsAdminAuthenticated(true);
              localStorage.setItem('alwarsha_admin_auth', 'true');
            } else alert("بيانات خاطئة! حاول مرة أخرى ❌");
          }} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black hover:scale-105 transition-transform">دخول</button>
        </div>
      </div>
    );
  }

  // --- واجهة اللوحة الرئيسية (بعد الدخول) ---
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 font-cairo select-none" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
        <div>
           <h1 className="text-3xl font-black text-yellow-400 italic tracking-tighter">AL-WARSHA</h1>
           <p className="text-[10px] text-zinc-500 font-mono tracking-widest">ADMIN PANEL v2.0</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => router.push('/')} className="px-4 py-2 bg-zinc-800 rounded-xl text-xs hover:bg-white hover:text-black transition-colors">الموقع 🏠</button>
           <button onClick={() => { localStorage.removeItem('alwarsha_admin_auth'); setIsAdminAuthenticated(false); }} className="px-4 py-2 bg-red-900/20 text-red-500 rounded-xl text-xs hover:bg-red-600 hover:text-white transition-colors">خروج 🚪</button>
        </div>
      </div>

      {/* أزرار التنقل */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button onClick={() => setActiveTab('products')} className={`p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'products' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>📦 المنتجات ({products.length})</button>
        <button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'users' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>👥 المستخدمين ({allUsers.length})</button>
        <button onClick={() => setActiveTab('messages')} className={`p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'messages' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>💬 الرسائل ({messages.length})</button>
        <button onClick={() => setActiveTab('reports')} className={`p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>🚨 البلاغات ({reports.length})</button>
      </div>

      {/* منطقة المحتوى */}
      <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl min-h-[500px] animate-fadeIn">
        
        {/* 1. جدول المنتجات */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-black text-zinc-500">
                <tr><th className="p-6">الجهاز</th><th className="p-6">البائع</th><th className="p-6">السعر</th><th className="p-6 text-center">تحكم</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {products.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-zinc-500">لا يوجد منتجات</td></tr> : products.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-6 flex items-center gap-4"><img src={p.image} className="w-12 h-12 rounded-xl object-cover border border-zinc-700" /><div><p className="font-bold">{p.name}</p><span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{p.category}</span></div></td>
                    <td className="p-6 text-zinc-400">{p.sellerName}</td>
                    <td className="p-6 text-yellow-400 font-bold">{p.price} ج.م</td>
                    <td className="p-6 text-center"><button onClick={() => deleteItem('products', p.id)} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-xs font-black hover:bg-red-500 hover:text-white transition-all">حذف 🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. إدارة المستخدمين (الحظر) */}
        {activeTab === 'users' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {allUsers.length === 0 ? <p className="text-zinc-500 p-4">لا يوجد مستخدمين</p> : allUsers.map(u => (
               <div key={u.id} className={`p-4 rounded-3xl border flex flex-col gap-4 bg-black transition-all ${u.banned ? 'border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-zinc-800'}`}>
                  <div className="flex items-center gap-4">
                     <img src={u.photo} className="w-14 h-14 rounded-full border-2 border-zinc-800" alt={u.name} />
                     <div>
                        <h3 className="font-black text-white">{u.name}</h3>
                        <p className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded mt-1 select-all">{u.id}</p>
                     </div>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                     <span className={`text-[10px] font-bold ${u.banned ? 'text-red-500' : 'text-green-500'}`}>{u.banned ? '⛔ محظور' : '✅ نشط'}</span>
                     <button onClick={() => toggleBan(u.id, u.banned)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${u.banned ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-red-600 text-white hover:bg-red-500'}`}>
                        {u.banned ? 'فك الحظر' : 'حظر المستخدم'}
                     </button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* 3. رسائل الدعم */}
        {activeTab === 'messages' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.length === 0 ? <p className="text-zinc-500 p-4">لا توجد رسائل جديدة</p> : messages.map(msg => (
              <div key={msg.id} className="bg-black p-6 rounded-[2rem] border border-zinc-800 hover:border-zinc-600 transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h4 className="font-black text-white text-sm">{msg.userName}</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">ID: {msg.userId}</p>
                   </div>
                   <button onClick={() => deleteItem('support', msg.id)} className="text-zinc-600 hover:text-red-500 text-lg">&times;</button>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl mb-4 text-xs text-zinc-300 leading-relaxed border border-zinc-800">
                   "{msg.msg}"
                </div>
                <button onClick={() => setChatModal({ show: true, userId: msg.userId, userName: msg.userName })} className="w-full bg-yellow-400 text-black py-3 rounded-xl font-black text-xs hover:scale-105 transition-transform">
                   فتح المحادثة والرد 💬
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 4. البلاغات */}
        {activeTab === 'reports' && (
           <div className="p-6 grid grid-cols-1 gap-4">
              {reports.length === 0 ? <p className="text-zinc-500 p-4">لا توجد بلاغات</p> : reports.map(rep => (
                 <div key={rep.id} className="bg-red-900/10 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                       <h4 className="font-bold text-red-400 text-sm">بلاغ ضد: {rep.reportedUserName}</h4>
                       <p className="text-xs text-zinc-400 mt-1">من: {rep.reporterName} • السبب: {rep.reason}</p>
                       <p className="text-[10px] text-zinc-600 mt-2">{new Date(rep.date).toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => toggleBan(rep.reportedUserId, false)} className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold">حظر المبلغ عنه</button>
                       <button onClick={() => deleteItem('reports', rep.id)} className="bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-bold">إغلاق</button>
                    </div>
                 </div>
              ))}
           </div>
        )}

      </div>

      {/* --- مودال الشات مع المستخدم --- */}
      {chatModal.show && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-zinc-950 w-full max-w-lg h-[80vh] rounded-[3rem] border border-zinc-800 flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
               <div>
                  <h3 className="font-black text-white text-lg">{chatModal.userName}</h3>
                  <span className="text-[10px] text-green-500 font-bold">● متصل الآن</span>
               </div>
               <button onClick={() => setChatModal({ show: false, userId: '', userName: '' })} className="text-3xl text-zinc-500 hover:text-white">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col no-scrollbar bg-black/50">
               {userChatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl max-w-[85%] shadow-md ${msg.fromId === 'Admin' ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-zinc-800 text-white border border-zinc-700 rounded-tl-none'}`}>
                       {msg.image && <img src={msg.image} className="w-48 rounded-lg mb-2 border border-black/10" />}
                       {msg.voice ? <p className="text-xs font-bold flex items-center gap-1">🎤 رسالة صوتية <span className="text-[8px] opacity-50">(استمع من الداشبورد)</span></p> : <p className="text-sm font-bold leading-relaxed">{msg.text}</p>}
                       <span className="text-[8px] opacity-50 block mt-1 text-right">{new Date(msg.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-2 items-center">
               <input 
                 className="flex-1 bg-black p-4 rounded-2xl outline-none text-white font-bold text-xs border border-zinc-700 focus:border-yellow-400 transition-all" 
                 placeholder="اكتب ردك..." 
                 value={replyText} 
                 onChange={(e) => setReplyText(e.target.value)}
                 onKeyPress={(e) => e.key === 'Enter' && sendReply()}
               />
               <button onClick={sendReply} className="bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-xs hover:bg-yellow-500 active:scale-90 transition-all">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* توقيع أحمد الذهبي */}
      <div className="text-center mt-12 opacity-30 hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.4em] italic">DEVELOPED BY AHMED</p>
      </div>
    </div>
  );
}
