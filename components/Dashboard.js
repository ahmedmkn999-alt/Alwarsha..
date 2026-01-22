import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";

export default function Dashboard({ user }) {
  // --- States ---
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isBanned, setIsBanned] = useState(false); 
  const [showBannedChat, setShowBannedChat] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // --- Data ---
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  // --- UI & Modals ---
  const [readChats, setReadChats] = useState([]); 
  const [pinnedChats, setPinnedChats] = useState([]); 
  const [optionsModal, setOptionsModal] = useState({ show: false, targetId: '', targetName: '' });
  const [showModal, setShowModal] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  
  // --- Inputs ---
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' });
  const [msgText, setMsgText] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- Audio ---
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

  // --- Effects ---
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    
    // AdSense
    try {
        const head = document.getElementsByTagName('head')[0];
        const adsScript = document.createElement('script');
        adsScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7765309726770552";
        adsScript.async = true;
        adsScript.crossOrigin = "anonymous";
        head.appendChild(adsScript);
    } catch(e) { console.log("AdSense Error"); }

    if(user?.uid) {
        update(ref(db, `users/${user.uid}`), {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            id: user.uid,
            lastSeen: new Date().toISOString()
        });
        
        onValue(ref(db, `users/${user.uid}/banned`), (snapshot) => {
            setIsBanned(snapshot.val() === true);
        });

        onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
            const data = snapshot.val();
            const loadedMsgs = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setMyMessages(loadedMsgs);
        });
    }

    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(loaded.reverse()); 
    });

    return () => clearTimeout(timer);
  }, [user]);

  // --- Functions ---
  const showToast = (message) => {
    setToast({ show: true, msg: message });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleTouchStart = (id, name) => { 
    longPressTimer.current = setTimeout(() => setOptionsModal({ show: true, targetId: id, targetName: name }), 800); 
  };
  
  const handleTouchEnd = () => { 
    if (longPressTimer.current) clearTimeout(longPressTimer.current); 
  };

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
    if (pinnedChats.includes(optionsModal.targetId)) {
        setPinnedChats(pinnedChats.filter(id => id !== optionsModal.targetId));
    } else {
        setPinnedChats([...pinnedChats, optionsModal.targetId]);
    }
    setOptionsModal({ ...optionsModal, show: false });
  };

  const deleteConversation = (otherId) => {
    if(!window.confirm("مسح المحادثة؟")) return;
    myMessages.forEach(msg => { 
        if (msg.fromId === otherId || msg.toId === otherId) {
            remove(ref(db, `messages/${user.uid}/${msg.id}`)); 
        }
    });
    showToast("🗑️ تم الحذف");
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
      recorder.start(); 
      setMediaRecorder(recorder); 
      setIsRecording(true);
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
        setUploading(false); 
        setShowModal(false); 
        setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' }); 
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

  // --- Banned Screen ---
  if (isBanned) {
      return (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 text-center animate-fadeIn font-cairo" dir="rtl">
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
                         <button onClick={() => {
                               if(!msgText.trim()) return;
                               const d = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() };
                               push(ref(db, `messages/Admin`), d); push(ref(db, `messages/${user.uid}`), { ...d, toId: 'Admin' });
                               setMsgText('');
                            }} className="bg-black text-white px-6 rounded-xl">إرسال</button>
                      </div>
                   </div>
                </div>
              )}
          </div>
      );
  }

  // --- Main View ---
  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      
      {toast.show && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-400 text-black px-6 py-3 rounded-full font-black shadow-xl border-2 border-black">{toast.msg}</div>}

      {showSplash && (
        <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center animate-fadeOut" style={{animationDelay: '3s', animationFillMode: 'forwards'}}>
           <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce"><span className="text-black text-5xl font-black italic">W</span></div>
           <h1 className="text-yellow-400 font-black text-3xl mt-6 italic">AL-WARSHA</h1>
        </div>
      )}

      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeTab !== 'home' && <button onClick={() => {setActiveTab('home'); setSelectedCategory('all');}} className="bg-zinc-900 p-2 rounded-xl text-yellow-400 font-black text-[10px]">⬅️ رجوع</button>}
            <div className="flex items-center gap-2" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-black"><span className="text-black text-xl font-black italic">W</span></div>
              <div className="text-xl font-black italic text-yellow-400">الورشة</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className="p-2.5 rounded-xl bg-zinc-900 text-zinc-500">🎧</button>
             <button onClick={() => setActiveTab('inbox')} className="p-2.5 rounded-xl bg-zinc-900 text-zinc-500 relative">📩 {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}</button>
             <img src={user.photoURL} className="w-9 h-9 rounded-full border border-zinc-700" onClick={() => setActiveTab('profile')} />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 animate-fadeIn">
        {activeTab === 'home' && (
          <>
            <div className="container mx-auto px-4 pb-3 relative">
                <input className="w-full bg-zinc-200 border-none rounded-2xl p-3 text-xs text-black outline-none font-bold text-center mb-4" placeholder="ابحث..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={(e) => { setSearchTerm(e.target.value); setShowSearchSuggestions(e.target.value.trim() !== ''); }} />
                
                {showSearchSuggestions && (
                    <>
                        <div className="fixed inset-0 z-[55] bg-black/10" onClick={() => setShowSearchSuggestions(false)}></div>
                        <div className="absolute top-[50px] left-4 right-4 bg-zinc-900 rounded-2xl mt-2 p-2 shadow-2xl z-[60] border border-zinc-800 max-h-60 overflow-y-auto">
                            <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-800 mb-2">
                                <span className="text-zinc-500 text-[10px]">النتائج</span>
                                <button onClick={() => setShowSearchSuggestions(false)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold">إغلاق ❌</button>
                            </div>
                            {categories.map(cat => <button key={cat.id} className="w-full text-right p-3 text-sm hover:bg-zinc-800 rounded-xl text-white block" onClick={() => {setSearchTerm(cat.name); setShowSearchSuggestions(false);}}>🔍 {cat.name}</button>)}
                        </div>
                    </>
                )}
                
                <div className="bg-white shadow-sm border-b py-4 sticky top-[70px] z-40">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 pb-2">
                    <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] flex flex-col items-center justify-center border-2 ${selectedCategory === 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-100'}`}><span className="text-2xl mb-2">🌍</span><span className="text-[10px] font-black">الكل</span></button>
                    {categories.map(cat => (
                      <div key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] relative overflow-hidden cursor-pointer border-2 ${selectedCategory === cat.name ? 'border-yellow-400 scale-105' : 'border-transparent'}`}>
                        <img src={cat.img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-end justify-center p-3"><span className="text-white text-[10px] font-black">{cat.name}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                  {filtered.map(item => (
                    <div key={item.id} className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all">
                      <div className="h-60 overflow-hidden relative"><img src={item.image} className="w-full h-full object-cover" onClick={() => setViewImage(item.image)} /><div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px]">{item.category}</div></div>
                      <div className="p-6 text-right">
                        <h3 className="font-black text-sm mb-4 line-clamp-1">{item.name} <span className="text-[10px] text-zinc-300">({item.condition})</span></h3>
                        <div className="font-black text-yellow-600 italic mb-4 text-lg">{item.price} ج.م</div>
                        <div className="flex gap-2"><a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center">📞 اتصال</a><button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px]">💬 دردشة</button></div>
                      </div>
                    </div>
                  ))}
                </div>
            ) : <div className="text-center py-20 opacity-50"><p className="text-xl font-black">لا توجد نتائج</p></div>}
          </>
        )}

        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black mb-6 text-right pr-3 border-r-4 border-yellow-400 italic">البريد 📩</h2>
            {uniqueConversations.map(chat => (
                <div key={chat.id} className="flex gap-2 items-center relative">
                    <button onClick={() => deleteConversation(chat.fromId === user.uid ? chat.toId : chat.fromId)} className="bg-red-50 text-red-500 w-12 h-20 rounded-2xl flex items-center justify-center">🗑️</button>
                    <div onClick={() => { if (!readChats.includes(chat.fromId === user.uid ? chat.toId : chat.fromId)) setReadChats([...readChats, chat.fromId === user.uid ? chat.toId : chat.fromId]); setMessageModal({ show: true, receiverId: chat.fromId === user.uid ? chat.toId : chat.fromId, receiverName: chat.fromName }); }} className="flex-1 bg-white p-6 rounded-[2rem] border flex items-center gap-5 cursor-pointer">
                        <div className="w-14 h-14 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black text-xl">{chat.fromName[0]}</div>
                        <div className="flex-1 text-right"><h4 className="font-black text-zinc-900">{chat.fromName}</h4><p className="text-xs text-zinc-400 line-clamp-1 mt-1">{chat.text || "صورة/صوت"}</p></div>
                    </div>
                </div>
            ))}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="max-w-md mx-auto space-y-6">
            <h2 className="text-2xl font-black text-center italic">الدعم الفني 🎧</h2>
            <div className="bg-white p-4 rounded-[2.5rem] border h-[300px] overflow-y-auto flex flex-col gap-3">
                {myMessages.filter(m => m.fromId === 'Admin' || m.toId === 'Admin').map((msg, i) => <div key={i} className={`p-3 rounded-2xl text-xs font-bold max-w-[80%] ${msg.fromId === user.uid ? 'bg-yellow-400 self-end text-black' : 'bg-zinc-100 self-start'}`}>{msg.text}</div>)}
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border text-center shadow-lg">
                <textarea className="w-full bg-zinc-50 border rounded-2xl p-4 text-sm mb-4" placeholder="اكتب مشكلتك..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
                <button onClick={() => { if(!supportMsg) return; const d = { userId: user.uid, userName: user.displayName, msg: supportMsg, date: new Date().toISOString() }; push(ref(db, 'support'), d); const c = { fromName: user.displayName, fromId: user.uid, text: supportMsg, date: new Date().toISOString() }; push(ref(db, `messages/Admin`), c); push(ref(db, `messages/${user.uid}`), { ...c, toId: 'Admin' }); setSupportMsg(''); showToast("✅ تم الإرسال"); }} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black">إرسال</button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto text-right">
            <div className="bg-white rounded-[2.5rem] p-8 border mb-8 text-center">
              <img src={user.photoURL} className="w-24 h-24 rounded-full mx-auto border-4 border-yellow-400 mb-4" />
              <h2 className="text-xl font-black mb-2">{user.displayName}</h2>
              <button onClick={() => signOut(auth).then(() => window.location.reload())} className="bg-red-50 text-red-600 px-8 py-2 rounded-xl font-black text-xs border border-red-100">خروج</button>
            </div>
            <h3 className="font-black mb-4 pr-3 border-r-4 border-yellow-400 italic">إعلاناتي</h3>
            <div className="grid grid-cols-1 gap-4">
                {products.filter(p => p.sellerId === user.uid).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-3xl border flex items-center justify-between"><div className="flex items-center gap-4"><img src={item.image} className="w-16 h-16 rounded-2xl object-cover" /><span className="font-black text-sm">{item.name}</span></div><button onClick={() => remove(ref(db, `products/${item.id}`))} className="text-red-500 p-2">🗑️</button></div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* --- Modals --- */}
      {optionsModal.show && <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={() => setOptionsModal({ ...optionsModal, show: false })}><div className="bg-white w-full max-w-sm p-6 rounded-[2rem] text-center space-y-4" onClick={e => e.stopPropagation()}><button onClick={handlePin} className="w-full bg-yellow-100 py-4 rounded-xl font-bold">📌 تثبيت</button><button onClick={handleReport} className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold">🚨 إبلاغ</button></div></div>}
      
      {!['inbox', 'profile', 'support'].includes(activeTab) && <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-lg text-4xl font-black z-[100] border-4 border-white">+</button>}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl">&times;</button>
            <h2 className="text-xl font-black mb-6 text-center italic">إضافة جهاز</h2>
            <form onSubmit={handlePublish} className="space-y-4 font-bold">
              <input type="file" onChange={(e) => {const f = e.target.files[0];const r = new FileReader();r.onload = () => setNewProduct({ ...newProduct, image: r.result });r.readAsDataURL(f);}} />
              <input placeholder="الاسم" className="w-full bg-zinc-100 p-4 rounded-xl" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select className="w-full bg-zinc-100 p-4 rounded-xl" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              <div className="flex gap-2"><input placeholder="السعر" className="flex-1 bg-zinc-100 p-4 rounded-xl" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /><select className="bg-zinc-100 p-4 rounded-xl" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}><option value="new">جديد</option><option value="used">مستعمل</option></select></div>
              <input placeholder="الموبايل" className="w-full bg-zinc-100 p-4 rounded-xl" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
              <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black">نشر الآن</button>
            </form>
          </div>
        </div>
      )}

      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-0 md:p-6">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[3rem] flex flex-col shadow-2xl relative">
            <div className="p-6 border-b flex justify-between items-center"><h3 className="font-black">{messageModal.receiverName}</h3><button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-4xl">&times;</button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col no-scrollbar">
               {myMessages.filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId).map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-xl max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400' : 'bg-zinc-100'}`}>
                       {msg.image && <img src={msg.image} className="w-48 rounded-xl mb-2" onClick={() => setViewImage(msg.image)} />}
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-44" /> : <p className="text-sm font-bold">{msg.text}</p>}
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t flex gap-2 items-center">
               {chatImage && <div className="absolute bottom-20 left-4 bg-zinc-900 p-2 rounded-xl"><img src={chatImage} className="w-20 h-20 rounded-lg" /><button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs">×</button></div>}
               <input type="file" className="hidden" id="chatFile" onChange={(e) => {const f = e.target.files[0]; if(f) {const r = new FileReader(); r.onload = () => setChatImage(r.result); r.readAsDataURL(f);}}} />
               <label htmlFor="chatFile" className="p-4 bg-zinc-100 rounded-2xl cursor-pointer">📎</label>
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onMouseMove={handleDrag} onTouchMove={handleDrag} className={`p-5 rounded-[1.5rem] ${isRecording ? 'bg-red-500 text-white' : 'bg-zinc-100'}`}>{isRecording ? '🛑' : '🎤'}</button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl" placeholder="اكتب..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-7 py-4 rounded-2xl font-black text-xs">إرسال</button>
            </div>
          </div>
        </div>
      )}
      {viewImage && <div className="fixed inset-0 bg-black/98 z-[200] flex items-center justify-center p-4" onClick={() => setViewImage(null)}><img src={viewImage} className="max-w-full max-h-full rounded-2xl" /><button className="absolute top-8 left-8 text-white text-5xl">&times;</button></div>}
      
      <footer className="text-center pb-10 pt-4 opacity-40"><p className="text-[12px] font-black uppercase tracking-[0.4em]">AHMED • 2026</p></footer>
    </div>
  );
}
