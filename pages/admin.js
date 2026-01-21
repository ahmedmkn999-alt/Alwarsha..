import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, push, update } from "firebase/database";
import { useRouter } from 'next/router';

export default function AdminPanel() {
  // --- الحالات (State) ---
  const [user, setUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  
  // --- البيانات ---
  const [activeTab, setActiveTab] = useState('users'); // خليتها تبدأ بالمستخدمين عشان تشوفهم علطول
  const [products, setProducts] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // دي القائمة اللي هيبان فيها كل اللي سجلوا
  const [messages, setMessages] = useState([]); 
  const [reports, setReports] = useState([]); 

  // --- الشات ---
  const [chatModal, setChatModal] = useState({ show: false, userId: '', userName: '' });
  const [replyText, setReplyText] = useState('');
  const [userChatHistory, setUserChatHistory] = useState([]);

  const router = useRouter();
  
  // بيانات دخول الأدمن
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com";
  const REQUIRED_USER = "ahmed"; 
  const REQUIRED_PASS = "0112838183800"; 

  useEffect(() => {
    // التحقق من الدخول
    const savedAuth = localStorage.getItem('alwarsha_admin_auth');
    if (savedAuth === 'true') setIsAdminAuthenticated(true);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setUser(currentUser);
        fetchData();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = () => {
    // 1. جلب المستخدمين (اللي سجلوا دخول)
    onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        setAllUsers(list); // هنا بتتحفظ بيانات الناس
    });

    // 2. جلب المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(list.reverse());
    });

    // 3. جلب المحادثات
    onValue(ref(db, 'messages'), (snapshot) => {
        const data = snapshot.val();
        // تصفية عشان نجيب قائمة الناس بس
        const userIds = data ? Object.keys(data).filter(k => k !== 'Admin') : [];
        setMessages(userIds);
    });

    // 4. جلب البلاغات
    onValue(ref(db, 'reports'), (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        setReports(list.reverse());
    });
  };

  // فتح شات معين
  useEffect(() => {
    if (chatModal.show && chatModal.userId) {
      onValue(ref(db, `messages/${chatModal.userId}`), (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        setUserChatHistory(list.sort((a,b) => new Date(a.date) - new Date(b.date)));
      });
    }
  }, [chatModal]);

  // --- التحكم ---

  // الحذف
  const deleteItem = async (path, id) => {
    if (confirm("حذف نهائي؟")) await remove(ref(db, `${path}/${id}`));
  };

  // ✅ حظر المستخدم (ده اللي بيخلي الشاشة تسود عنده)
  const toggleBan = (uid, currentStatus, name) => {
      const action = currentStatus ? "فك الحظر" : "حظر";
      if(confirm(`هل أنت متأكد من ${action} العضو ${name}؟`)) {
          update(ref(db, `users/${uid}`), { banned: !currentStatus });
      }
  };

  // الرد على الرسائل
  const sendReply = () => {
    if (!replyText.trim()) return;
    const msgData = { fromName: "إدارة الورشة ⚡", fromId: "Admin", text: replyText, date: new Date().toISOString() };
    push(ref(db, `messages/${chatModal.userId}`), msgData);
    push(ref(db, `messages/Admin`), { ...msgData, toId: chatModal.userId });
    setReplyText('');
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-400">جاري التحميل...</div>;

  // شاشة تسجيل الدخول للوحة
  if (user && !isAdminAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-cairo" dir="rtl">
        <div className="bg-zinc-900 p-8 rounded-2xl w-96 border border-zinc-700 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-center text-yellow-400">لوحة التحكم 🔐</h2>
          <input className="w-full p-3 bg-black rounded mb-4 border border-zinc-700" placeholder="المستخدم" onChange={e=>setLoginForm({...loginForm, username:e.target.value})} />
          <input className="w-full p-3 bg-black rounded mb-4 border border-zinc-700" type="password" placeholder="كلمة السر" onChange={e=>setLoginForm({...loginForm, password:e.target.value})} />
          <button onClick={()=>{if(loginForm.username===REQUIRED_USER && loginForm.password===REQUIRED_PASS){setIsAdminAuthenticated(true);localStorage.setItem('alwarsha_admin_auth','true')}else alert("بيانات خاطئة")}} className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-500">دخول</button>
        </div>
      </div>
    );
  }

  if (!user) return <div className="text-white bg-black h-screen flex items-center justify-center font-bold">يجب تسجيل الدخول كأدمن في الموقع أولاً</div>;

  // --- اللوحة الرئيسية ---
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-cairo select-none" dir="rtl">
      
      <div className="flex justify-between mb-8 border-b border-zinc-800 pb-4">
        <div>
            <h1 className="text-2xl font-black text-yellow-400 italic">AL-WARSHA ADMIN</h1>
            <p className="text-[10px] text-zinc-500">CONTROL PANEL</p>
        </div>
        <button onClick={()=>{localStorage.removeItem('alwarsha_admin_auth'); setIsAdminAuthenticated(false);}} className="bg-red-900/20 text-red-500 px-4 py-2 rounded-xl text-xs hover:bg-red-600 hover:text-white transition-colors">خروج</button>
      </div>

      {/* التبويبات */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button onClick={()=>setActiveTab('users')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap ${activeTab==='users'?'bg-blue-600 text-white':'bg-zinc-900 text-zinc-400'}`}>👥 المستخدمين ({allUsers.length})</button>
        <button onClick={()=>setActiveTab('products')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap ${activeTab==='products'?'bg-yellow-400 text-black':'bg-zinc-900 text-zinc-400'}`}>📦 المنتجات ({products.length})</button>
        <button onClick={()=>setActiveTab('messages')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap ${activeTab==='messages'?'bg-green-600 text-white':'bg-zinc-900 text-zinc-400'}`}>💬 المحادثات ({messages.length})</button>
        <button onClick={()=>setActiveTab('reports')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap ${activeTab==='reports'?'bg-red-600 text-white':'bg-zinc-900 text-zinc-400'}`}>🚨 البلاغات ({reports.length})</button>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 min-h-[500px]">
        
        {/* 1. قسم المستخدمين (الحظر) - ده اللي طلبته */}
        {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allUsers.length === 0 ? <p className="text-zinc-500">مفيش حد سجل لسه</p> : allUsers.map(u => (
                    <div key={u.id} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${u.banned ? 'bg-red-900/20 border-red-500' : 'bg-black border-zinc-800'}`}>
                        <div className="flex items-center gap-3">
                            <img src={u.photo} className="w-12 h-12 rounded-full border border-zinc-700" />
                            <div>
                                <h3 className="font-bold text-sm text-white">{u.name} {u.banned && <span className="text-[10px] text-red-500">(محظور)</span>}</h3>
                                <p className="text-[10px] text-zinc-500">{u.email}</p>
                                <p className="text-[9px] text-zinc-600 mt-1 font-mono">{u.id}</p>
                            </div>
                        </div>
                        <button 
                            onClick={()=>toggleBan(u.id, u.banned, u.name)} 
                            className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${u.banned ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                        >
                            {u.banned ? 'فك الحظر ✅' : 'حظر المستخدم 🚫'}
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* 2. قسم المنتجات */}
        {activeTab === 'products' && (
            <div className="space-y-3">
                {products.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-black p-3 rounded-xl border border-zinc-800 hover:border-zinc-600">
                        <div className="flex items-center gap-4">
                            <img src={p.image} className="w-12 h-12 rounded-lg object-cover" />
                            <div>
                                <p className="font-bold text-sm">{p.name}</p>
                                <p className="text-xs text-zinc-500">{p.sellerName} | <span className="text-yellow-500">{p.price} ج.م</span></p>
                            </div>
                        </div>
                        <button onClick={()=>deleteItem('products', p.id)} className="bg-red-500/10 text-red-500 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all">حذف</button>
                    </div>
                ))}
            </div>
        )}

        {/* 3. قسم المحادثات */}
        {activeTab === 'messages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messages.map(uid => (
                    <div key={uid} className="bg-black p-4 rounded-xl border border-zinc-800 flex justify-between items-center hover:border-yellow-400/50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lg">👤</div>
                            <div>
                                <p className="font-bold text-sm text-white">مستخدم</p>
                                <p className="text-[10px] text-zinc-500 font-mono">{uid.slice(0,8)}...</p>
                            </div>
                        </div>
                        <button onClick={()=>setChatModal({show:true, userId:uid, userName:'عميل'})} className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-bold">مراسلة</button>
                    </div>
                ))}
            </div>
        )}

        {/* 4. قسم البلاغات */}
        {activeTab === 'reports' && (
            <div className="space-y-3">
                {reports.map(r => (
                    <div key={r.id} className="bg-red-900/10 border border-red-500/30 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="text-red-400 font-bold text-sm">بلاغ ضد: {r.reportedUserName}</p>
                            <p className="text-xs text-zinc-400 mt-1">السبب: {r.reason}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">بواسطة: {r.reporterName}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>toggleBan(r.reportedUserId, false, r.reportedUserName)} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">حظر</button>
                            <button onClick={()=>deleteItem('reports', r.id)} className="bg-zinc-800 text-white px-3 py-1 rounded text-xs font-bold">حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* مودال الشات */}
      {chatModal.show && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 w-full max-w-lg h-[80vh] rounded-2xl flex flex-col border border-zinc-700 shadow-2xl">
                <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
                    <h3 className="font-bold text-yellow-400">محادثة مع العميل</h3>
                    <button onClick={()=>setChatModal({show:false, userId:'', userName:''})} className="text-2xl hover:text-red-500">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
                    {userChatHistory.map((msg, i) => (
                        <div key={i} className={`p-3 rounded-xl max-w-[80%] text-sm ${msg.fromId==='Admin'?'bg-yellow-400 text-black self-end ml-auto':'bg-zinc-800 text-white'}`}>
                            {msg.image && <img src={msg.image} className="w-full rounded mb-2" />}
                            <p>{msg.text}</p>
                            <p className="text-[9px] opacity-50 mt-1">{new Date(msg.date).toLocaleTimeString()}</p>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-zinc-700 flex gap-2">
                    <input className="flex-1 bg-black p-3 rounded border border-zinc-600 text-sm" placeholder="اكتب ردك..." value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyPress={e=>e.key==='Enter'&&sendReply()} />
                    <button onClick={sendReply} className="bg-yellow-400 text-black px-5 rounded font-bold text-sm">إرسال</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
