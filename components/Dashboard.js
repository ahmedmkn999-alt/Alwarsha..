import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";

// --- كومبوننت الكارت (مدمج هنا عشان المشاكل تختفي) ---
const ProductCard = ({ item, onViewImage, onChat, isOwner, onDelete }) => {
  return (
    <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
      <div className="h-60 overflow-hidden relative">
        <img 
          src={item.image} 
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-700" 
          onClick={() => onViewImage(item.image)} 
          alt={item.name}
        />
        <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px] shadow-md">
          {item.category}
        </div>
        {isOwner && (
            <button onClick={() => onDelete(item.id)} className="absolute top-3 left-3 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md font-bold z-10">🗑️</button>
        )}
      </div>
      <div className="p-6 text-right">
        <h3 className="font-black text-sm mb-4 line-clamp-1">
          {item.name} <span className="text-[10px] text-zinc-300 font-normal mr-1">({item.condition === 'new' ? 'جديد' : 'مستعمل'})</span>
        </h3>
        <div className="font-black text-yellow-600 italic mb-4 text-lg">{item.price} ج.م</div>
        <div className="flex gap-2">
          <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center border hover:bg-zinc-200 transition-colors text-black no-underline">📞 اتصال</a>
          {!isOwner && (
            <button onClick={() => onChat(item)} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px] hover:bg-yellow-400 hover:text-black transition-colors">💬 دردشة</button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- الكومبوننت الرئيسي ---
export default function Dashboard({ user }) {
  // 1. States
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isBanned, setIsBanned] = useState(false); 
  const [showBannedChat, setShowBannedChat] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // 2. Data
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  // 3. UI
  const [readChats, setReadChats] = useState([]); 
  const [pinnedChats, setPinnedChats] = useState([]); 
  const [optionsModal, setOptionsModal] = useState({ show: false, targetId: '', targetName: '' });
  const [showModal, setShowModal] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  
  // 4. Inputs
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'قطع غيار' });
  const [msgText, setMsgText] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 5. Audio
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);
  const longPressTimer = useRef(null);

  const categories = [
    { id: 'parts', name: 'قطع غيار', img: '/parts.jpg' },
    { id: 'heater', name: 'سخانات', img: '/heater.jpg' },
    { id: 'ac', name: 'تكييفات', img: '/ac.jpg.webp' },
    { id: 'wash', name: 'غسالات', img: '/washing.jpg' },
    { id: 'fridge', name: 'ثلاجات', img: '/fridge.jpg' },
    { id: 'stove', name: 'بوتجازات', img: '/stove.jpg' },
    { id: 'fan', name: 'مراوح', img: '/fan.jpg' },
    { id: 'blender', name: 'خلاطات', img: '/blender.jpg' },
    { id: 'caps', name: 'كابات', img: '/caps.jpg' }
  ];

  // 6. Effects
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    
    if(user?.uid) {
        update(ref(db, `users/${user.uid}`), {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            id: user.uid,
            lastSeen: new Date().toISOString()
        });
        
        onValue(ref(db, `users/${user.uid}/banned`), (snapshot) => setIsBanned(snapshot.val() === true));
        onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
            const data = snapshot.val();
            setMyMessages(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
        });
    }

    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      setProducts(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
    });

    return () => clearTimeout(timer);
  }, [user]);

  // 7. Functions
  const showToast = (message) => {
    setToast({ show: true, msg: message });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleTouchStart = (id, name) => { 
    longPressTimer.current = setTimeout(() => setOptionsModal({ show: true, targetId: id, targetName: name }), 800); 
  };
  
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleReport = () => {
    if(confirm(`الإبلاغ عن ${optionsModal.targetName}؟`)) {
        push(ref(db, 'reports'), {
          reporterId: user.uid, reporterName: user.displayName,
          reportedUserId: optionsModal.targetId, reportedUserName: optionsModal.targetName,
          date: new Date().toISOString(), reason: "بلاغ من الشات"
        });
        showToast("✅ تم الإبلاغ"); 
    }
    setOptionsModal({ ...optionsModal, show: false });
  };

  const handlePin = () => {
    if (pinnedChats.includes(optionsModal.targetId)) setPinnedChats(pinnedChats.filter(id => id !== optionsModal.targetId));
    else setPinnedChats([...pinnedChats, optionsModal.targetId]);
    setOptionsModal({ ...optionsModal, show: false });
  };

  const deleteConversation = (otherId) => {
    if(!window.confirm("مسح المحادثة؟")) return;
    myMessages.forEach(msg => { 
        if (msg.fromId === otherId || msg.toId === otherId) remove(ref(db, `messages/${user.uid}/${msg.id}`)); 
    });
    showToast("🗑️ تم الحذف");
  };

  const deleteProduct = (id) => {
      if(confirm("حذف الإعلان؟")) {
          remove(ref(db, `products/${id}`));
          showToast("🗑️ تم الحذف");
      }
  };

  const sendMsgToSeller = () => {
    if(!msgText.trim() && !chatImage) return;
    const msgData = { fromName: user.displayName, fromId: user.uid, text: msgText, image: chatImage, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
    setMsgText(''); setChatImage(null);
  };

  const startRecording = async (e) => {
    try {
      touchStartPos.current = e.touches ? e.touches[0].clientX : e.clientX;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (ev) => chunks.push(ev.data);
      recorder.onstop = () => {
        if (!isCancelled) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
             const msgData = { fromName: user.displayName, fromId: user.uid, voice: reader.result, date: new Date().toISOString() };
             push(ref(db, `messages/${messageModal.receiverId}`), msgData);
             push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
          };
        } setIsCancelled(false);
      }; 
      recorder.start(); setMediaRecorder(recorder); setIsRecording(true);
    } catch (err) { showToast("🎤 الميكروفون غير متاح"); }
  };

  const handleDrag = (e) => { 
      if (!isRecording) return; 
      if ((e.touches ? e.touches[0].clientX : e.clientX) - touchStartPos.current > 70) setIsCancelled(true); 
      else setIsCancelled(false); 
  };
  
  const stopRecording = () => { if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); } };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name || !newProduct.phone || !newProduct.price) return showToast("⚠️ بيانات ناقصة");
    setUploading(true);
    push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
    .then(() => { 
        setUploading(false); setShowModal(false); 
        setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'قطع غيار' }); 
        showToast("✅ تم النشر"); 
    });
  };

  const filtered = products.filter(p => {
    const normalize = (str) => str?.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').trim() || "";
    const search = normalize(searchTerm);
    const matchSearch = normalize(p.name).includes(search) || normalize(p.category).includes(search);
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const uniqueConversations = [...new Map(myMessages.filter(m => m.fromId !== 'Admin' && m.toId !== 'Admin').map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()];
  const unreadCount = uniqueConversations.filter(c => c.fromId !== user.uid && !readChats.includes(c.fromId)).length;

  if (isBanned) return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 text-center font-cairo" dir="rtl">
          <h1 className="text-red-600 text-4xl font-black mb-4">AL-WARSHA</h1>
          <h2 className="text-white text-2xl font-bold mb-2">تم حظرك يا {user.displayName} 🚫</h2>
          <button onClick={() => setShowBannedChat(true)} className="bg-white text-black px-10 py-4 rounded-full font-black mt-4">💬 تواصل مع الإدارة</button>
          {showBannedChat && (
            <div className="fixed inset-0 bg-black z-[10000] flex items-center justify-center p-0 md:p-6">
               <div className="bg-white w-full max-w-lg h-full md:rounded-[3rem] flex flex-col overflow-hidden">
                  <div className="p-6 bg-zinc-950 text-white flex justify-between items-center"><button onClick={() => setShowBannedChat(false)} className="text-3xl">&times;</button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
                     {myMessages.filter(m => m.fromId === 'Admin' || m.toId === 'Admin').map((msg, i) => (
                        <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                           <div className={`p-4 rounded-xl ${msg.fromId === user.uid ? 'bg-zinc-900 text-white' : 'bg-white border'}`}>{msg.text}</div>
                        </div>
                     ))}
                  </div>
                  <div className="p-5 bg-white border-t flex gap-2">
                     <input className="flex-1 bg-zinc-100 p-4 rounded-xl" placeholder="اكتب..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
                     <button onClick={() => { if(!msgText.trim()) return; const d = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() }; push(ref(db, `messages/Admin`), d); push(ref(db, `messages/${user.uid}`), { ...d, toId: 'Admin' }); setMsgText(''); }} className="bg-black text-white px-6 rounded-xl">إرسال</button>
                  </div>
               </div>
            </div>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      {toast.show && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-400 text-black px-6 py-3 rounded-full font-black shadow-xl border-2 border-black">{toast.msg}</div>}

      {showSplash && (
        <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center animate-fadeOut" style={{animationDelay: '3s', animationFillMode: 'forwards'}}>
           <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce"><span className="text-black text-5xl font-black italic">W</span></div>
           <h1 className="text-yellow-400 font-black text-3xl mt-6 italic">AL-WARSHA</h1>
           <p className="text-zinc-500 text-sm mt-2 font-bold tracking-widest">EST. 2026</p>
           <div className="mt-10 text-center animate-pulse"><p className="text-white text-xl font-bold">مرحباً بك يا</p><p className="text-yellow-400 text-2xl font-black mt-2">{user?.displayName || "يا غالي"} ❤️</p></div>
        </div>
      )}

      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeTab !== 'home' && <button onClick={() => {setActiveTab('home'); setSelectedCategory('all');}} className="bg-zinc-900 p-2 rounded-xl text-yellow-400 font-black text-[10px]">⬅️ رجوع</button>}
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-black"><span className="text-black text-xl font-black italic">W</span></div>
              <div className="text-xl font-black italic text-yellow-400 tracking-tighter">الورشة</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-2.5 rounded-xl relative transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                📩 {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center border-2 border-zinc-950 font-black animate-pulse">{unreadCount}</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className={`active:scale-90 transition-transform ${activeTab === 'profile' ? 'ring-2 ring-yellow-400 p-0.5 rounded-full' : ''}`}>
                <img src={user.photoURL} className="w-9 h-9 rounded-full border border-zinc-700 object-cover" alt="profile" />
             </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 animate-fadeIn">
        {activeTab === 'home' && (
          <>
            <div className="container mx-auto px-4 pb-3 relative">
                <input className="w-full bg-zinc-200 border-none rounded-2xl p-3 text-xs text-black outline-none focus:ring-1 focus:ring-yellow-400 font-bold text-center mb-4 shadow-inner" placeholder="ابحث في الورشة..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={(e) => { setSearchTerm(e.target.value); setShowSearchSuggestions(e.target.value.trim() !== ''); }} />
                {showSearchSuggestions && (
                    <>
                        <div className="fixed inset-0 z-[55] bg-black/10 backdrop-blur-[1px]" onClick={() => setShowSearchSuggestions(false)}></div>
                        <div className="absolute top-[50px] left-4 right-4 bg-zinc-900 rounded-2xl mt-2 p-2 shadow-2xl z-[60] border border-zinc-800 max-h-60 overflow-y-auto animate-slideDown">
                            <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-800 mb-2">
