import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove } from "firebase/database";
import { signOut } from "firebase/auth";

export default function Dashboard({ user }) {
  // --- حالات التحكم ---
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // --- حالات البيانات ---
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  // --- حالات الميزات الجديدة (التثبيت والقراءة والخيارات) ---
  const [readChats, setReadChats] = useState([]); // لتخزين المحادثات المقروءة
  const [pinnedChats, setPinnedChats] = useState([]); // لتخزين المحادثات المثبتة
  const [optionsModal, setOptionsModal] = useState({ show: false, targetId: '', targetName: '' }); // مودال الخيارات
  const longPressTimer = useRef(null); // مؤقت الضغطة المطولة

  // --- حالات المودالات ---
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' 
  });
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');
  
  // --- نظام الفويس ---
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);

  const categories = [
    { id: 'parts', name: 'قطع غيار', img: '/parts.jpg' },
    { id: 'heater', name: 'سخانات', img: '/heater (1).jpg' },
    { id: 'ac', name: 'تكييفات', img: '/ac.jpg.webp' },
    { id: 'wash', name: 'غسالات', img: '/washing.jpg' },
    { id: 'fridge', name: 'ثلاجات', img: '/fridge.jpg' },
    { id: 'stove', name: 'بوتجازات', img: '/stove.jpg' },
    { id: 'fan', name: 'مراوح', img: '/fan.jpg' },
    { id: 'blender', name: 'خلاطات', img: '/blender.jpg' },
    { id: 'caps', name: 'كابات', img: '/caps.jpg' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    const head = document.getElementsByTagName('head')[0];
    
    // AdSense & SEO
    const adsScript = document.createElement('script');
    adsScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7765309726770552";
    adsScript.async = true;
    adsScript.crossOrigin = "anonymous";
    head.appendChild(adsScript);

    const title = document.createElement('title'); title.innerText = "الورشة"; head.appendChild(title);
    const meta = document.createElement('meta'); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"; head.appendChild(meta);
    const manifestLink = document.createElement('link'); manifestLink.rel = 'manifest'; manifestLink.href = '/manifest.json'; head.appendChild(manifestLink);
    const appleIcon = document.createElement('link'); appleIcon.rel = 'apple-touch-icon'; appleIcon.href = '/icon.png.jpg'; head.appendChild(appleIcon);
    const googleVer = document.createElement('meta'); googleVer.name = "google-site-verification"; googleVer.content = "v_xxxxxxxxxxxxxxxxxxxxxx"; head.appendChild(googleVer);

    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(loaded.reverse()); 
    });

    if (user?.uid) {
      onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
        setMyMessages(loadedMsgs);
      });
    }
    return () => clearTimeout(timer);
  }, [user]);

  // --- دوال التحكم في الضغطة المطولة ---
  const handleTouchStart = (id, name) => {
    longPressTimer.current = setTimeout(() => {
      setOptionsModal({ show: true, targetId: id, targetName: name });
    }, 800); // 0.8 ثانية تعتبر ضغطة مطولة
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // --- دالة الإبلاغ ---
  const handleReport = () => {
    const reportData = {
      reporterId: user.uid,
      reporterName: user.displayName,
      reportedUserId: optionsModal.targetId,
      reportedUserName: optionsModal.targetName,
      date: new Date().toISOString(),
      reason: "بلاغ من المستخدم عبر التطبيق"
    };
    push(ref(db, 'reports'), reportData); // إرسال لقاعدة البيانات
    alert(`تم إرسال بلاغ ضد ${optionsModal.targetName} للإدارة 🚨`);
    setOptionsModal({ ...optionsModal, show: false });
  };

  // --- دالة التثبيت ---
  const handlePin = () => {
    if (pinnedChats.includes(optionsModal.targetId)) {
      setPinnedChats(pinnedChats.filter(id => id !== optionsModal.targetId)); // إلغاء التثبيت
    } else {
      setPinnedChats([...pinnedChats, optionsModal.targetId]); // تثبيت
    }
    setOptionsModal({ ...optionsModal, show: false });
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setSelectedCategory('all'); setSearchTerm(''); };
  const handleBack = () => { setActiveTab('home'); setSelectedCategory('all'); setSearchTerm(''); };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value !== '') { setSelectedCategory('all'); setActiveTab('home'); setShowSearchSuggestions(true); }
  };

  const deleteConversation = (otherId) => {
    if(!window.confirm("هل أنت متأكد من مسح المحادثة؟ لا يمكن التراجع.")) return;
    myMessages.forEach(msg => {
        if (msg.fromId === otherId || msg.toId === otherId) {
            remove(ref(db, `messages/${user.uid}/${msg.id}`));
        }
    });
    alert("تم مسح المحادثة بنجاح 🗑️");
  };

  // --- Voice & Chat Logic ---
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
        }
        setIsCancelled(false);
      };
      recorder.start(); setMediaRecorder(recorder); setIsRecording(true);
    } catch (err) { alert("يرجى تفعيل الميكروفون 🎤"); }
  };

  const handleDrag = (e) => { if (!isRecording) return; if ((e.touches ? e.touches[0].clientX : e.clientX) - touchStartPos.current > 70) setIsCancelled(true); else setIsCancelled(false); };
  const stopRecording = () => { if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); } };

  const sendMsgToSeller = () => {
    if(!msgText.trim()) return;
    const msgData = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
    setMsgText('');
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name || !newProduct.phone || !newProduct.price) return alert("أكمل البيانات 🚀");
    setUploading(true);
    push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
    .then(() => { setUploading(false); setShowModal(false); setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' }); alert("تم النشر بنجاح ✅"); });
  };

  const adminMessages = myMessages.filter(m => m.fromId === 'Admin' || m.toId === 'Admin');
  const customerMessages = myMessages.filter(m => m.fromId !== 'Admin' && m.toId !== 'Admin');

  // حساب عدد الرسائل غير المقروءة (الفريدة)
  const uniqueConversations = [...new Map(customerMessages.map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()];
  const unreadCount = uniqueConversations.filter(c => {
    const otherId = c.fromId === user.uid ? c.toId : c.fromId;
    // الرسالة غير مقروءة لو كانت من الطرف التاني ولسه متمش فتحها
    return c.fromId !== user.uid && !readChats.includes(otherId);
  }).length;

  const filtered = products.filter(p => {
    const normalize = (str) => str?.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').trim() || "";
    const search = normalize(searchTerm);
    const name = normalize(p.name);
    const categoryName = normalize(p.category);
    const matchSearch = name.includes(search) || categoryName.includes(search);
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchTab = activeTab === 'home' || p.condition === activeTab;
    return matchSearch && matchCategory && matchTab;
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      
      {showSplash && (
        <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center animate-fadeOut" style={{animationDelay: '3s', animationFillMode: 'forwards'}}>
           <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_50px_rgba(255,215,0,0.5)] animate-bounce">
              <span className="text-black text-5xl font-black italic">W</span>
           </div>
           <h1 className="text-yellow-400 font-black text-3xl mt-6 tracking-tighter uppercase italic">AL-WARSHA</h1>
           <p className="text-zinc-500 text-sm mt-2 font-bold tracking-widest">EST. 2026</p>
           <div className="mt-10 text-center animate-pulse">
              <p className="text-white text-xl font-bold">مرحباً بك يا</p>
              <p className="text-yellow-400 text-2xl font-black mt-2">{user.displayName} ❤️</p>
           </div>
        </div>
      )}

      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeTab !== 'home' && (
              <button onClick={handleBack} className="bg-zinc-900 p-2 rounded-xl text-yellow-400 font-black text-[10px] active:scale-90 transition-all">⬅️ رجوع</button>
            )}
            <div className="flex items-center gap-2 cursor-pointer group" onClick={handleBack}>
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-black">
                 <span className="text-black text-xl font-black italic">W</span>
              </div>
              <div className="text-xl font-black italic text-yellow-400 tracking-tighter">الورشة</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                🎧 {adminMessages.some(m => m.fromId === 'Admin') && <span className="absolute top-1 right-1 bg-red-600 w-2 h-2 rounded-full"></span>}
             </button>
             {/* ✅ العداد الجديد للرسائل */}
             <button onClick={() => setActiveTab('inbox')} className={`p-2.5 rounded-xl relative transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                📩 {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center border-2 border-zinc-950 font-black animate-pulse">{unreadCount}</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className={`active:scale-90 transition-transform ${activeTab === 'profile' ? 'ring-2 ring-yellow-400 p-0.5 rounded-full' : ''}`}>
                <img src={user.photoURL} className="w-9 h-9 rounded-full border border-zinc-700 object-cover" alt="profile" />
             </button>
          </div>
        </div>
        {activeTab === 'home' && (
          <div className="container mx-auto px-4 pb-3 relative animate-fadeIn">
              <input className="w-full bg-zinc-900 border-none rounded-2xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-yellow-400 font-bold text-center" placeholder="ابحث في الورشة..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={handleSearchChange} />
              
              {showSearchSuggestions && (
                <>
                  <div className="fixed inset-0 z-[55] cursor-pointer" onClick={() => setShowSearchSuggestions(false)}></div>
                  <div className="absolute top-full left-4 right-4 bg-zinc-900 rounded-2xl mt-2 p-2 shadow-2xl z-[60] border border-zinc-800 max-h-60 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2 px-2 border-b border-zinc-800 pb-2 sticky top-0 bg-zinc-900">
                       <span className="text-[10px] text-zinc-400">اقتراحات البحث</span>
                       <button onClick={() => setShowSearchSuggestions(false)} className="text-yellow-400 font-black text-xs bg-zinc-800 px-3 py-1 rounded-lg">إغلاق ×</button>
                    </div>
                    {categories.map(cat => (
                      <button key={cat.id} className="w-full text-right p-3 text-sm hover:bg-zinc-800 rounded-xl transition-colors font-bold text-white" onClick={() => {setSearchTerm(cat.name); setShowSearchSuggestions(false);}}>🔍 {cat.name}</button>
                    ))}
                  </div>
                </>
              )}
          </div>
        )}
      </header>

      {activeTab === 'home' && (
        <div className="bg-white shadow-sm border-b py-4 overflow-x-auto no-scrollbar sticky top-[125px] z-40 animate-slideDown">
          <div className="container mx-auto px-4 flex gap-4">
            <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] flex flex-col items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'border-yellow-400 bg-yellow-50 shadow-lg' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}>
              <span className="text-2xl mb-2">🌍</span><span className="text-[10px] font-black">الكل</span>
            </button>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] relative overflow-hidden cursor-pointer border-2 transition-all ${selectedCategory === cat.name ? 'border-yellow-400 scale-105 shadow-xl' : 'border-transparent opacity-80'}`}>
                <img src={cat.img} className="w-full h-full object-cover" alt={cat.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center p-3 text-center">
                  <span className="text-white text-[10px] font-black leading-tight">{cat.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="container mx-auto p-4 md:p-8 animate-fadeIn">
        
        {activeTab === 'home' && (
          <>
            <div className="flex justify-center gap-3 mb-8">
              <button onClick={() => handleTabChange('home')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'home' ? 'bg-zinc-950 text-yellow-400 shadow-lg' : 'bg-white text-zinc-400 border'}`}>الكل</button>
              <button onClick={() => handleTabChange('new')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'new' ? 'bg-zinc-950 text-yellow-400 shadow-lg' : 'bg-white text-zinc-400 border'}`}>جديد ✨</button>
              <button onClick={() => handleTabChange('used')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'used' ? 'bg-zinc-950 text-yellow-400 shadow-lg' : 'bg-white text-zinc-400 border'}`}>مستعمل 🛠️</button>
            </div>
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filtered.map(item => (
                    <div key={item.id} className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                      <div className="h-60 overflow-hidden relative">
                        <img src={item.image} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-700" onClick={() => setViewImage(item.image)} />
                        <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px] shadow-md">{item.category}</div>
                      </div>
                      <div className="p-6 text-right">
                        <h3 className="font-black text-sm mb-4 line-clamp-1">{item.name} <span className="text-[10px] text-zinc-300 font-normal">({item.condition === 'new' ? 'جديد' : 'مستعمل'})</span></h3>
                        <div className="font-black text-yellow-600 italic mb-4 text-lg">{item.price} ج.م</div>
                        <div className="flex gap-2">
                           <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center border">📞 اتصال</a>
                           <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px]">💬 دردشة</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <p className="text-xl font-black">لا توجد نتائج بحث 🔍</p>
                    <button onClick={() => handleTabChange('home')} className="mt-4 text-yellow-500 font-bold underline">عرض كل المنتجات</button>
                </div>
            )}
          </>
        )}

        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black mb-6 text-right pr-3 border-r-4 border-yellow-400 italic">بريد الورشة 📩</h2>
            {uniqueConversations.length === 0 ? (
                <p className="text-center text-zinc-400 py-10 font-bold">صندوق الوارد فارغ 📭</p>
            ) : (
                // ترتيب المحادثات: المثبتة أولاً، ثم الأحدث
                uniqueConversations.sort((a,b) => {
                    const idA = a.fromId === user.uid ? a.toId : a.fromId;
                    const idB = b.fromId === user.uid ? b.toId : b.fromId;
                    const isPinnedA = pinnedChats.includes(idA);
                    const isPinnedB = pinnedChats.includes(idB);
                    if (isPinnedA && !isPinnedB) return -1;
                    if (!isPinnedA && isPinnedB) return 1;
                    return new Date(b.date) - new Date(a.date);
                }).map(chat => {
                    const otherId = chat.fromId === user.uid ? chat.toId : chat.fromId;
                    const isPinned = pinnedChats.includes(otherId);
                    
                    return (
                        <div key={chat.id} className="flex gap-2 items-center relative select-none">
                            <button onClick={() => deleteConversation(otherId)} className="bg-red-50 text-red-500 w-12 h-20 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all">🗑️</button>
                            <div 
                                // ✅ إضافة أحداث الضغطة المطولة هنا
                                onContextMenu={(e) => { e.preventDefault(); }} // منع القائمة العادية
                                onTouchStart={() => handleTouchStart(otherId, chat.fromName)}
                                onTouchEnd={handleTouchEnd}
                                onMouseDown={() => handleTouchStart(otherId, chat.fromName)} // للكمبيوتر برضه
                                onMouseUp={handleTouchEnd}
                                onClick={() => {
                                    // عند الضغط، نعتبر الرسالة مقروءة
                                    if (!readChats.includes(otherId)) setReadChats([...readChats, otherId]);
                                    setMessageModal({ show: true, receiverId: otherId, receiverName: chat.fromName });
                                }}
                                className={`flex-1 bg-white p-6 rounded-[2rem] border flex items-center gap-5 cursor-pointer hover:border-yellow-400 transition-all shadow-sm ${isPinned ? 'border-yellow-400 ring-2 ring-yellow-100 bg-yellow-50' : ''}`}
                            >
                                <div className="w-14 h-14 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black text-xl relative">
                                    {chat.fromName[0]}
                                    {isPinned && <span className="absolute -top-1 -left-1 text-sm">📌</span>}
                                </div>
                                <div className="flex-1 text-right">
                                    <h4 className="font-black text-zinc-900">{chat.fromName}</h4>
                                    <p className="text-xs text-zinc-400 line-clamp-1 mt-1">{chat.text || "🎤 رسالة صوتية"}</p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="max-w-md mx-auto space-y-6">
            <h2 className="text-2xl font-black text-center italic">الدعم الفني المباشر 🎧</h2>
            <div className="bg-white p-4 rounded-[2.5rem] border shadow-inner h-[300px] overflow-y-auto flex flex-col gap-3 no-scrollbar">
                {adminMessages.length > 0 ? (
                    adminMessages.sort((a,b) => new Date(a.date) - new Date(b.date)).map((msg, i) => (
                        <div key={i} className={`p-3 rounded-2xl text-xs font-bold max-w-[80%] ${msg.fromId === user.uid ? 'bg-yellow-400 self-end text-black' : 'bg-zinc-100 self-start text-zinc-800'}`}>
                            {msg.text || "🎤 رسالة صوتية"}
                        </div>
                    ))
                ) : (
                    <p className="text-center text-zinc-400 my-auto text-xs">لا توجد رسائل سابقة مع الدعم</p>
                )}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border text-center shadow-lg">
                <textarea className="w-full bg-zinc-50 border rounded-2xl p-4 text-sm mb-4 outline-none min-h-[100px] font-bold" placeholder="اكتب مشكلتك هنا..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
                <button onClick={() => {
                    if(!supportMsg) return;
                    const msgData = { userId: user.uid, userName: user.displayName, msg: supportMsg, date: new Date().toISOString() };
                    push(ref(db, 'support'), msgData);
                    const chatData = { fromName: user.displayName, fromId: user.uid, text: supportMsg, date: new Date().toISOString() };
                    push(ref(db, `messages/Admin`), chatData); 
                    push(ref(db, `messages/${user.uid}`), { ...chatData, toId: 'Admin' });
                    setSupportMsg(''); alert("تم الإرسال للدعم ✅");
                }} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black shadow-lg">إرسال للمدير</button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto text-right">
            <div className="bg-white rounded-[2.5rem] p-8 border mb-8 text-center shadow-sm">
              <img src={user.photoURL} className="w-24 h-24 rounded-full mx-auto border-4 border-yellow-400 mb-4 object-cover shadow-lg" alt="user" />
              <h2 className="text-xl font-black mb-2">{user.displayName}</h2>
              <button onClick={() => signOut(auth).then(() => window.location.reload())} className="bg-red-50 text-red-600 px-8 py-2 rounded-xl font-black text-xs border border-red-100">تسجيل الخروج</button>
            </div>
            <h3 className="font-black mb-4 pr-3 border-r-4 border-yellow-400 italic">إعلاناتي</h3>
            <div className="grid grid-cols-1 gap-4">
                {products.filter(p => p.sellerId === user.uid).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-3xl border flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <img src={item.image} className="w-16 h-16 rounded-2xl object-cover" alt={item.name} />
                            <span className="font-black text-sm">{item.name}</span>
                        </div>
                        <button onClick={() => remove(ref(db, `products/${item.id}`))} className="text-red-500 p-2">🗑️</button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* --- ✅ مودال الخيارات الجديد (تثبيت / إبلاغ) --- */}
      {optionsModal.show && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setOptionsModal({ ...optionsModal, show: false })}>
            <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl animate-slideUp text-center space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-black text-lg mb-4">خيارات المحادثة ⚙️</h3>
                <p className="text-sm text-zinc-500 mb-6">مع {optionsModal.targetName}</p>
                
                <button onClick={handlePin} className="w-full bg-yellow-100 text-yellow-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-yellow-200">
                    {pinnedChats.includes(optionsModal.targetId) ? '❌ إلغاء التثبيت' : '📌 تثبيت في الأعلى'}
                </button>
                
                <button onClick={handleReport} className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100">
                    🚨 إبلاغ عن المستخدم
                </button>
                
                <button onClick={() => setOptionsModal({ ...optionsModal, show: false })} className="w-full text-zinc-400 text-xs font-bold pt-2">إلغاء</button>
            </div>
        </div>
      )}

      {/* --- المودالات نفس القديم --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] relative overflow-y-auto max-h-[90vh] shadow-2xl animate-slideUp">
             <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl text-zinc-300 hover:text-black">&times;</button>
             <h2 className="text-xl font-black mb-6 text-center italic">إضافة جهاز للورشة 🚀</h2>
             <form onSubmit={handlePublish} className="space-y-4 font-bold">
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center cursor-pointer relative hover:bg-zinc-50">
                    <input type="file" accept="image/*" onChange={(e) => {
                       const file = e.target.files[0];
                       const reader = new FileReader();
                       reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
                       reader.readAsDataURL(file);
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {newProduct.image ? <img src={newProduct.image} className="h-40 mx-auto rounded-xl shadow-md object-contain" /> : <p className="text-xs text-zinc-400 py-10 font-black">ارفع صورة الجهاز 📸</p>}
                </div>
                <input placeholder="اسم الجهاز" className="w-full bg-zinc-100 p-4 rounded-xl outline-none text-sm font-bold" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <select className="w-full bg-zinc-100 p-4 rounded-xl font-bold text-sm outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                     {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <div className="flex gap-2">
                   <input placeholder="السعر" className="flex-1 bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                   <select className="bg-zinc-100 p-4 rounded-xl font-bold text-sm outline-none" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                      <option value="new">✨ جديد</option><option value="used">🛠️ مستعمل</option>
                   </select>
                </div>
                <input placeholder="رقم الموبايل" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black shadow-lg">نشر الآن ✅</button>
             </form>
          </div>
        </div>
      )}

      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-0 md:p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[3rem] flex flex-col shadow-2xl relative animate-slideUp">
            <div className="p-6 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[3rem]">
               <h3 className="font-black text-lg">{messageModal.receiverName === 'Admin' ? 'إدارة الورشة ⚡' : messageModal.receiverName}</h3>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-4xl text-zinc-300 hover:text-black">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col no-scrollbar">
               {myMessages.filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId).sort((a,b) => new Date(a.date) - new Date(b.date)).map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-[1.5rem] shadow-sm max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-zinc-100 text-zinc-800 rounded-tl-none'}`}>
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-44" /> : <p className="text-sm font-bold leading-relaxed">{msg.text}</p>}
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t md:rounded-b-[3rem] flex gap-2 items-center relative">
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onMouseMove={handleDrag} onTouchMove={handleDrag} className={`p-5 rounded-[1.5rem] transition-all ${isRecording ? (isCancelled ? 'bg-zinc-800 text-red-500 scale-125' : 'bg-red-500 text-white scale-125 shadow-lg') : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}>
                 {isCancelled ? '🗑️' : (isRecording ? '🛑' : '🎤')}
               </button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-xs" placeholder={isRecording ? (isCancelled ? "اترك للحذف" : "اسحب يمين للإلغاء ➡️") : "اكتب رسالة للورشة..."} value={msgText} onChange={(e) => setMsgText(e.target.value)} disabled={isRecording} />
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-7 py-4 rounded-2xl font-black text-xs hover:bg-yellow-400 hover:text-black transition-colors">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 bg-black/98 z-[200] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewImage(null)}>
           <img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-zoomIn" alt="full view" />
           <button className="absolute top-8 left-8 text-white text-5xl hover:text-yellow-400 transition-colors">&times;</button>
        </div>
      )}

      {!['inbox', 'profile', 'support'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-[0_10px_40px_rgba(255,215,0,0.4)] text-4xl font-black z-[100] border-4 border-white hover:scale-110 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-yellow-400/20">+</button>
      )}

      <footer className="text-center pb-10 pt-4 opacity-40">
          <p className="text-[12px] text-zinc-400 font-black uppercase tracking-[0.4em] italic italic font-cairo">AHMED • EST. 2026</p>
      </footer>

    </div>
  );
}
