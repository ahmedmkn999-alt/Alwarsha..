import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { ref, onValue, remove, push, update } from "firebase/database";
import { useRouter } from 'next/router';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  
  // التبويبات
  const [activeTab, setActiveTab] = useState('users'); 
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]); 
  const [reports, setReports] = useState([]); 

  // الشات
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
      if (currentUser) {
        setUser(currentUser);
        // لو هو الأدمن، هات البيانات
        if(currentUser.email === ADMIN_EMAIL) {
            fetchData();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = () => {
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      setProducts(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
    });
    onValue(ref(db, 'support'), (snapshot) => {
      const data = snapshot.val();
      setMessages(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
    });
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      setAllUsers(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
    });
    onValue(ref(db, 'reports'), (snapshot) => {
      const data = snapshot.val();
      setReports(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
    });
  };

  useEffect(() => {
    if (chatModal.show && chatModal.userId) {
      const chatRef = ref(db, `messages/${chatModal.userId}`);
      onValue(chatRef, (snapshot) => {
        const data = snapshot.val();
        setUserChatHistory(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).sort((a,b) => new Date(a.date) - new Date(b.date)) : []);
      });
    }
  }, [chatModal]);

  const deleteItem = async (path, id) => {
    if (confirm("⚠️ حذف نهائي؟")) {
      await remove(ref(db, `${path}/${id}`));
    }
  };

  const toggleBan = (userId, currentStatus) => {
    if (confirm(currentStatus ? "فك الحظر؟" : "حظر المستخدم؟ 🚫")) {
      update(ref(db, `users/${userId}`), { banned: !currentStatus });
    }
  };

  const sendReply = () => {
    if (!replyText.trim()) return;
    const msgData = { fromName: "إدارة الورشة ⚡", fromId: "Admin", text: replyText, date: new Date().toISOString() };
    push(ref(db, `messages/${chatModal.userId}`), msgData);
    push(ref(db, `messages/Admin`), { ...msgData, toId: chatModal.userId });
    setReplyText('');
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("خطأ: " + error.message);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400 font-black">جاري التحميل...</div>;

  if (!user) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-cairo" dir="rtl">
        <h1 className="text-3xl text-yellow-400 font-black mb-6">لوحة التحكم 🔒</h1>
        <button onClick={handleGoogleLogin} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-all">تسجيل دخول الأدمن</button>
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-cairo">
            <h1 className="text-red-500 font-black text-2xl mb-4">غير مسموح بالدخول 🚫</h1>
            <p className="text-zinc-500 mb-6">الإيميل {user.email} ليس مسؤولاً.</p>
            <button onClick={() => auth.signOut()} className="bg-zinc-800 px-6 py-2 rounded-lg">خروج</button>
        </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-yellow-400/20 w-full max-sm shadow-2xl">
          <h2 className="text-xl font-black text-white mb-6 text-center">تأكيد هوية الأدمن 🔐</h2>
          <input type="text" placeholder="المستخدم" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white mb-4 outline-none" onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" placeholder="كلمة السر" className="w-full p-4 bg-black border border-zinc-800 rounded-2xl text-white mb-4 outline-none" onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
          <button onClick={() => {
            if (loginForm.username === REQUIRED_USER && loginForm.password === REQUIRED_PASS) {
              setIsAdminAuthenticated(true);
              localStorage.setItem('alwarsha_admin_auth', 'true');
            } else alert("بيانات خاطئة ❌");
          }} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black">دخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-cairo" dir="rtl">
      <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-black text-yellow-400 italic">AL-WARSHA CONTROL</h1>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-zinc-800 rounded-xl text-xs hover:bg-white hover:text-black transition-all">الرئيسية 🏠</button>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>المستخدمين ({allUsers.length})</button>
        <button onClick={() => setActiveTab('products')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'products' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>المنتجات ({products.length})</button>
        <button onClick={() => setActiveTab('messages')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'messages' ? 'bg-green-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>الدعم ({messages.length})</button>
        <button onClick={() => setActiveTab('reports')} className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap ${activeTab === 'reports' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>البلاغات ({reports.length})</button>
      </div>

      <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl animate-fadeIn p-6 min-h-[500px]">
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            {allUsers.length === 0 ? <p className="text-zinc-500 text-center">لا يوجد مستخدمين</p> : allUsers.map(u => (
              <div key={u.id} className={`p-4 rounded-[2rem] border flex items-center justify-between transition-all ${u.banned ? 'border-red-500 bg-red-900/10' : 'border-zinc-800 bg-black'}`}>
                 <div className="flex items-center gap-4">
                    <img src={u.photo} className="w-14 h-14 rounded-full border border-zinc-700" alt={u.name} />
                    <div><h3 className="font-black text-white text-sm">{u.name}</h3><p className="text-[10px] text-zinc-500">{u.email}</p></div>
                 </div>
                 <button onClick={() => toggleBan(u.id, u.banned)} className={`px-4 py-2 rounded-xl text-xs font-black ${u.banned ? 'bg-green-600' : 'bg-red-600'}`}>{u.banned ? 'فك الحظر' : 'حظر'}</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="flex flex-col gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-black p-4 rounded-[2rem] border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4"><img src={p.image} className="w-16 h-16 rounded-2xl object-cover" /><div className="text-right"><h4 className="font-black text-sm">{p.name}</h4><p className="text-yellow-400 font-bold text-xs">{p.price} ج.م</p></div></div>
                <button onClick={() => deleteItem('products', p.id)} className="text-red-500 font-bold text-xs">حذف</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="flex flex-col gap-4">
            {messages.map(msg => (
              <div key={msg.id} className="bg-black p-6 rounded-[2rem] border border-zinc-800">
                <div className="flex justify-between mb-2"><span className="font-black text-sm">{msg.userName}</span><button onClick={() => deleteItem('support', msg.id)} className="text-red-500 text-xs">×</button></div>
                <p className="text-zinc-400 text-xs mb-4">{msg.msg}</p>
                <button onClick={() => setChatModal({ show: true, userId: msg.userId, userName: msg.userName })} className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-xs font-black">رد 💬</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="flex flex-col gap-4">
            {reports.map(rep => (
              <div key={rep.id} className="bg-red-900/10 p-6 rounded-[2rem] border border-red-900/30">
                <div className="flex justify-between mb-2"><span className="font-black text-red-500 text-sm">بلاغ ضد: {rep.reportedUserName}</span><button onClick={() => deleteItem('reports', rep.id)} className="text-zinc-500 text-xs">إغلاق</button></div>
                <p className="text-zinc-300 text-xs mb-4">السبب: {rep.reason}</p>
                <button onClick={() => toggleBan(rep.reportedUserId, false)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black">حظر المبلغ عنه</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {chatModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-zinc-900 w-full max-w-lg h-[80vh] rounded-[3rem] border border-zinc-800 flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center"><h3 className="font-black text-yellow-400">محادثة: {chatModal.userName}</h3><button onClick={() => setChatModal({ show: false, userId: '', userName: '' })} className="text-2xl">&times;</button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col no-scrollbar">
               {userChatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl max-w-[85%] shadow-md ${msg.fromId === 'Admin' ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-zinc-800 text-white border border-zinc-700 rounded-tl-none'}`}>
                       <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                       <span className="text-[8px] opacity-50 block mt-1">{new Date(msg.date).toLocaleTimeString()}</span>
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-6 bg-zinc-800 border-t border-zinc-700 flex gap-2 items-center">
               <input className="flex-1 bg-black p-4 rounded-2xl outline-none text-white font-bold text-xs border border-zinc-700 focus:border-yellow-400" placeholder="رد الإدارة..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
               <button onClick={sendReply} className="bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-xs hover:bg-yellow-500">إرسال</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
