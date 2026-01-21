import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, push, update } from "firebase/database"; // ضفت update عشان الحظر
import { useRouter } from 'next/router';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  
  // الحالة
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // 👥 قائمة المستخدمين الجديدة
  
  // حالة الشات
  const [chatModal, setChatModal] = useState({ show: false, userId: '', userName: '' });
  const [replyText, setReplyText] = useState('');
  const [userChatHistory, setUserChatHistory] = useState([]);

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
    // 3. 👥 المستخدمين (عشان تشوف مين دخل وتحظرهم)
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setAllUsers(list.reverse()); // الأحدث فوق
    });
  };

  // جلب المحادثة
  useEffect(() => {
    if (chatModal.show && chatModal.userId) {
      const chatRef = ref(db, `messages/${chatModal.userId}`);
      onValue(chatRef, (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        setUserChatHistory(list.sort((a,b) => new Date(a.date) - new Date(b.date)));
      });
    }
  }, [chatModal]);

  const deleteItem = async (path, id) => {
    if (confirm("⚠️ حذف نهائي؟")) {
      await remove(ref(db, `${path}/${id}`));
      alert("تم الحذف ✅");
    }
  };

  // 🚫 دالة الحظر (الجديدة)
  const toggleBan = (userId, currentStatus, userName) => {
    const action = currentStatus ? "فك الحظر" : "حظر";
    if (confirm(`هل أنت متأكد من ${action} المستخدم ${userName}؟`)) {
      update(ref(db, `users/${userId}`), { banned: !currentStatus });
    }
  };

  const sendReply = () => {
    if (!replyText.trim()) return;
    const msgData = {
      fromName: "إدارة الورشة ⚡",
      fromId: "Admin",
      text: replyText,
      date: new Date().toISOString()
    };
    push(ref(db, `messages/${chatModal.userId}`), msgData);
    push(ref(db, `messages/Admin`), { ...msgData, toId: chatModal.userId }); // نسخة ليك
    setReplyText('');
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400 font-black">جاري التحميل...</div>;

  if (user && !isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-yellow-400/20 w-full max-sm shadow-2xl">
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
      
      <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-black text-yellow-400 italic">AL-WARSHA CONTROL</h1>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-zinc-800 rounded-xl text-xs">الرئيسية 🏠</button>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('products')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'products' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-zinc-900 text-zinc-500'}`}>الأجهزة ({products.length})</button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-900 text-zinc-500'}`}>المستخدمين ({allUsers.length})</button>
        <button onClick={() => setActiveTab('messages')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'messages' ? 'bg-green-600 text-white shadow-lg' : 'bg-zinc-900 text-zinc-500'}`}>الدعم ({messages.length})</button>
      </div>

      <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl animate-fadeIn min-h-[500px]">
        
        {/* قسم الأجهزة */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-black text-zinc-500">
                <tr><th className="p-6">الجهاز</th><th className="p-6">السعر</th><th className="p-6">القسم</th><th className="p-6 text-center">حذف</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="p-6 flex items-center gap-4"><img src={p.image} className="w-12 h-12 rounded-xl object-cover" />{p.name}</td>
                    <td className="p-6 text-yellow-400 font-bold">{p.price} ج.م</td>
                    <td className="p-6"><span className="bg-zinc-800 px-3 py-1 rounded-lg text-[9px]">{p.category}</span></td>
                    <td className="p-6 text-center"><button onClick={() => deleteItem('products', p.id)} className="text-red-500 hover:scale-125 transition-transform">🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 👥 قسم المستخدمين (الجديد - الحظر) */}
        {activeTab === 'users' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.length === 0 ? <p className="text-zinc-500">مفيش مستخدمين سجلوا لسه</p> : allUsers.map(u => (
              <div key={u.id} className={`p-4 rounded-[2rem] border flex flex-col gap-4 bg-black transition-all ${u.banned ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-zinc-800'}`}>
                 <div className="flex items-center gap-4">
                    <img src={u.photo} className="w-14 h-14 rounded-full border border-zinc-700" alt={u.name} />
                    <div>
                       <h3 className="font-black text-white text-sm">{u.name}</h3>
                       <p className="text-[10px] text-zinc-500">{u.email}</p>
                       <p className="text-[9px] text-zinc-600 mt-1 font-mono">{u.id.slice(0,10)}...</p>
                    </div>
                 </div>
                 <button onClick={() => toggleBan(u.id, u.banned, u.name)} className={`w-full py-3 rounded-xl font-black text-xs transition-all ${u.banned ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                    {u.banned ? '✅ فك الحظر' : '⛔ حظر المستخدم'}
                 </button>
              </div>
            ))}
          </div>
        )}

        {/* قسم الرسائل */}
        {activeTab === 'messages' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.map(msg => (
              <div key={msg.id} className="bg-black p-6 rounded-[2rem] border border-zinc-800 flex flex-col justify-between hover:border-yellow-400/30 transition-all">
                <div className="mb-4">
                   <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-yellow-400 text-sm">{msg.userName}</span>
                      <span className="text-[9px] text-zinc-600 italic">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                   </div>
                   <p className="text-zinc-300 text-xs font-bold leading-relaxed">{msg.msg}</p>
                </div>
                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                  <button onClick={() => setChatModal({ show: true, userId: msg.userId, userName: msg.userName })} className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-xl">رد 💬</button>
                  <button onClick={() => deleteItem('support', msg.id)} className="text-[10px] font-black text-red-500">حذف ×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مودال الشات الكامل */}
      {chatModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-zinc-900 w-full max-w-lg h-[80vh] rounded-[3rem] border border-zinc-800 flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center">
               <h3 className="font-black text-yellow-400">محادثة: {chatModal.userName}</h3>
               <button onClick={() => setChatModal({ show: false, userId: '', userName: '' })} className="text-2xl">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col no-scrollbar">
               {userChatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl max-w-[85%] shadow-md ${msg.fromId === 'Admin' ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-zinc-800 text-white border border-zinc-700 rounded-tl-none'}`}>
                       {msg.image && <img src={msg.image} className="w-48 rounded-lg mb-2" />}
                       <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                       <span className="text-[8px] opacity-50 block mt-1">{new Date(msg.date).toLocaleTimeString('ar-EG')}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-6 bg-zinc-800 border-t border-zinc-700 flex gap-2 items-center">
               <input 
                 className="flex-1 bg-black p-4 rounded-2xl outline-none text-white font-bold text-xs border border-zinc-700 focus:border-yellow-400 transition-all" 
                 placeholder="اكتب رد الإدارة هنا..." 
                 value={replyText} 
                 onChange={(e) => setReplyText(e.target.value)}
                 onKeyPress={(e) => e.key === 'Enter' && sendReply()}
               />
               <button onClick={sendReply} className="bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-xs hover:bg-yellow-500 active:scale-90 transition-all">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* توقيع أحمد الذهبي الفخم في نهاية اللوحة */}
      <div className="text-center mt-12 opacity-50">
        <p className="text-[12px] text-[#D4AF37] font-black uppercase tracking-[0.4em] italic drop-shadow-md">AHMED</p>
        <p className="text-[8px] text-zinc-800 font-bold mt-1">THE WORKSHOP ADMIN SYSTEM • 2026</p>
      </div>
    </div>
  );
}
