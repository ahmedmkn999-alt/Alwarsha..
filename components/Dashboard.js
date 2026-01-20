import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove } from "firebase/database";
import { signOut } from "firebase/auth";

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' });
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState(null);

  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');
  
  // نظام الفويس (WhatsApp Style)
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);

  // الأقسام مربوطة بأسماء الصور اللي رفعتها على جيت هب
  const categories = [
    { id: 'parts', name: 'قطع غيار', img: '/parts.jpg' },
    { id: 'ac', name: 'تكييفات', img: '/ac.jpg.webp' },
    { id: 'wash', name: 'غسالات', img: '/washing.jpg' },
    { id: 'fridge', name: 'ثلاجات', img: '/fridge.jpg' },
    { id: 'heater', name: 'سخانات', img: '/heater.jpg' },
    { id: 'stove', name: 'بوتجازات', img: '/stove.jpg' },
    { id: 'fan', name: 'مراوح', img: '/fan.jpg' },
    { id: 'blender', name: 'خلاطات', img: '/blender.jpg' },
    { id: 'caps', name: 'كابات', img: '/caps.jpg' }
  ];

  useEffect(() => {
    // 1. منع الزوم التلقائي في الموبايل
    const meta = document.createElement('meta');
    meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
    document.getElementsByTagName('head')[0].appendChild(meta);

    // 2. جلب المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) loaded.push({ id: key, ...data[key] });
      setProducts(loaded.reverse()); 
    });

    // 3. جلب الرسائل
    if (user?.uid) {
      onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = [];
        for (const key in data) loadedMsgs.push({ id: key, ...data[key] });
        setMyMessages(loadedMsgs);
      });
    }
  }, [user]);

  // --- وظائف الفويس والشات ---
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
          reader.onloadend = () => sendVoiceMsg(reader.result);
        }
        setIsCancelled(false);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert("يرجى تفعيل الميكروفون 🎤"); }
  };

  const handleDrag = (e) => {
    if (!isRecording) return;
    const currentPos = e.touches ? e.touches[0].clientX : e.clientX;
    if (currentPos - touchStartPos.current > 70) setIsCancelled(true);
    else setIsCancelled(false);
  };

  const stopRecording = () => { if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); } };

  const sendVoiceMsg = (voiceData) => {
    const msgData = { fromName: user.displayName, fromId: user.uid, voice: voiceData, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
  };

  const sendMsgToSeller = () => {
    if(!msgText.trim()) return;
    const msgData = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
    setMsgText('');
  };

  // --- وظائف النشر في الورشة ---
  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name || !newProduct.phone || !newProduct.price) return alert("البيانات ناقصة 🚀");
    setUploading(true);
    push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
    .then(() => { 
      setUploading(false); setShowModal(false); 
      setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' }); 
      alert("تم النشر بنجاح في الورشة ✅");
    });
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchTab = activeTab === 'home' || p.condition === activeTab;
    return matchSearch && matchCategory && matchTab;
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      
      {/* Header الورشة */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-2xl font-black italic text-yellow-400 cursor-pointer" onClick={() => {setActiveTab('home'); setSelectedCategory('all');}}>الورشة</div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2 rounded-xl ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-2 rounded-xl relative ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'text-zinc-500'}`}>
                📩 {myMessages.filter(m => m.fromId !== user.uid).length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center border border-black">!</span>}
             </button>
             <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className={`w-8 h-8 rounded-full border ${activeTab === 'profile' ? 'border-yellow-400' : 'border-zinc-700'}`} /></button>
          </div>
        </div>
        
        {/* البحث الذكي بالاقتراحات */}
        <div className="container mx-auto px-4 pb-3 relative">
            <input className="w-full bg-zinc-900 border-none rounded-2xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-yellow-400 font-bold" placeholder="ابحث في الورشة..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={(e) => setSearchTerm(e.target.value)} />
            {showSearchSuggestions && (
              <div className="absolute top-full left-4 right-4 bg-zinc-900 rounded-2xl mt-2 p-2 shadow-2xl z-[60] border border-zinc-800">
                {categories.map(cat => (
                  <button key={cat.id} className="w-full text-right p-3 text-sm hover:bg-zinc-800 rounded-xl" onClick={() => {setSearchTerm(cat.name); setShowSearchSuggestions(false);}}>🔍 {cat.name}</button>
                ))}
                <button onClick={() => setShowSearchSuggestions(false)} className="w-full p-2 text-xs text-yellow-400 font-bold">إغلاق ×</button>
              </div>
            )}
        </div>
      </header>

      {/* شريط الأقسام (صور GitHub 4x6) */}
      <div className="bg-white shadow-sm border-b py-4 overflow-x-auto no-scrollbar sticky top-[125px] z-40">
        <div className="container mx-auto px-4 flex gap-4">
          <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] flex flex-col items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'border-yellow-400 bg-yellow-50 shadow-lg' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}>
            <span className="text-2xl mb-2">🌍</span><span className="text-[10px] font-black">الكل</span>
          </button>
          {categories.map(cat => (
            <div key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] relative overflow-hidden cursor-pointer border-2 transition-all ${selectedCategory === cat.name ? 'border-yellow-400 scale-105 shadow-xl' : 'border-transparent opacity-80'}`}>
              <img src={cat.img} className="w-full h-full object-cover" alt={cat.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center p-3">
                <span className="text-white text-[10px] font-black">{cat.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-8">
        
        {/* تبويبات الحالة (جديد / مستعمل) */}
        <div className="flex justify-center gap-3 mb-8">
          <button onClick={() => setActiveTab('home')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'home' ? 'bg-zinc-950 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white text-zinc-400 border'}`}>الكل</button>
          <button onClick={() => setActiveTab('new')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'new' ? 'bg-zinc-950 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white text-zinc-400 border'}`}>جديد ✨</button>
          <button onClick={() => setActiveTab('used')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'used' ? 'bg-zinc-950 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white text-zinc-400 border'}`}>مستعمل 🛠️</button>
        </div>

        {/* عرض المنتجات */}
        {(activeTab === 'home' || activeTab === 'new' || activeTab === 'used') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                <div className="h-60 overflow-hidden relative">
                  <img src={item.image} className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105" onClick={() => setViewImage(item.image)} />
                  <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px] shadow-md">{item.category}</div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-sm mb-4 line-clamp-1">{item.name}</h3>
                  <div className="flex justify-between items-center mb-4">
                    <div className="font-black text-yellow-600 italic">{item.price} ج.م</div>
                  </div>
                  {user.uid !== item.sellerId ? (
                    <div className="flex gap-2">
                      <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center flex items-center justify-center gap-1 hover:bg-zinc-200 transition-colors">📞 اتصال</a>
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-yellow-400 hover:text-black transition-colors">💬 دردشة</button>
                    </div>
                  ) : (
                    <div className="text-center py-2 bg-zinc-50 rounded-xl text-[9px] font-bold text-zinc-400">إعلانك الخاص 👑</div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center py-20 text-zinc-400 font-bold italic">لا يوجد أجهزة في هذا القسم حالياً..</div>}
          </div>
        )}

        {/* صندوق الوارد */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6 pr-3 border-r-4 border-yellow-400">محادثات الورشة</h2>
            {[...new Map(myMessages.filter(m => m.fromId !== user.uid).map(m => [m.fromId, m])).values()].map(chat => (
              <div key={chat.id} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId, receiverName: chat.fromName })} className="bg-white p-5 rounded-[2rem] border flex items-center gap-4 cursor-pointer hover:border-yellow-400 transition-all">
                <div className="w-12 h-12 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black">{chat.fromName[0]}</div>
                <div className="flex-1 text-right">
                  <h4 className="font-black text-sm">{chat.fromName}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-1">{chat.voice ? "🎤 فويس" : chat.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* الدعم الفني */}
        {activeTab === 'support' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] border text-center shadow-lg animate-fadeIn">
            <h2 className="text-xl font-black mb-4 italic">دعم الورشة 🎧</h2>
            <textarea className="w-full bg-zinc-50 border rounded-2xl p-4 text-sm mb-4 outline-none min-h-[150px] font-bold" placeholder="اكتب مشكلتك هنا..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
            <button onClick={() => {
                if(!supportMsg) return;
                push(ref(db, 'support'), { userId: user.uid, userName: user.displayName, msg: supportMsg, date: new Date().toISOString() });
                setSupportMsg(''); alert("تم الإرسال للدعم ⚡");
            }} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform">إرسال للمراجعة</button>
          </div>
        )}

        {/* البروفايل */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-[2.5rem] p-8 border mb-8 text-center shadow-sm">
              <img src={user.photoURL} className="w-20 h-20 rounded-full mx-auto border-4 border-yellow-400 mb-4" />
              <h2 className="text-xl font-black">{user.displayName}</h2>
              <button onClick={() => signOut(auth).then(() => window.location.reload())} className="mt-6 bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs border border-red-100">تسجيل الخروج</button>
            </div>
            <h3 className="font-black mb-4 pr-3 border-r-4 border-yellow-400">إعلاناتي</h3>
            {products.filter(p => p.sellerId === user.uid).map(item => (
                <div key={item.id} className="bg-white p-3 rounded-3xl border mb-3 flex items-center justify-between">
                    <img src={item.image} className="w-14 h-14 rounded-2xl object-cover cursor-pointer" onClick={() => setViewImage(item.image)} />
                    <span className="font-bold text-sm">{item.name}</span>
                    <button onClick={() => remove(ref(db, `products/${item.id}`))} className="text-red-500 p-2">🗑️</button>
                </div>
            ))}
          </div>
        )}
      </main>

      {/* مودال النشر المطور (اختيار القسم) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] relative overflow-y-auto max-h-[90vh] animate-slideUp">
             <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl text-zinc-300 hover:text-black">&times;</button>
             <h2 className="text-xl font-black mb-6 text-center">إضافة جهاز للورشة 🚀</h2>
             <form onSubmit={handlePublish} className="space-y-4">
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center cursor-pointer relative hover:bg-zinc-50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => {
                       const file = e.target.files[0];
                       const reader = new FileReader();
                       reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
                       reader.readAsDataURL(file);
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {newProduct.image ? <img src={newProduct.image} className="h-32 mx-auto rounded-xl shadow-md" /> : <p className="text-xs text-zinc-400 font-bold">ارفع صورة الجهاز 📸</p>}
                </div>
                <input placeholder="اسم الجهاز" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <select className="w-full bg-zinc-100 p-4 rounded-xl font-bold text-sm outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                     {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <div className="flex gap-2">
                   <input placeholder="السعر" className="flex-1 bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                   <select className="bg-zinc-100 p-4 rounded-xl font-bold text-sm outline-none" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                      <option value="new">جديد</option><option value="used">مستعمل</option>
                   </select>
                </div>
                <input placeholder="رقم الموبايل" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform">{uploading ? 'جاري الرفع للورشة..' : 'نشر الآن ✅'}</button>
             </form>
          </div>
        </div>
      )}

      {/* شاشة الشات الفخمة */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center backdrop-blur-md p-0 md:p-6">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[3rem] flex flex-col shadow-2xl relative animate-slideUp">
            <div className="p-5 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[3rem]">
               <h3 className="font-black text-lg">{messageModal.receiverName}</h3>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-4xl text-zinc-300 hover:text-black transition-colors">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
               {myMessages.filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId).sort((a,b) => new Date(a.date) - new Date(b.date)).map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-[1.5rem] shadow-sm max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400 text-black rounded-tr-none shadow-yellow-400/10' : 'bg-white text-zinc-800 rounded-tl-none border border-gray-100'}`}>
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-44" /> : <p className="text-sm font-bold leading-relaxed">{msg.text}</p>}
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t md:rounded-b-[3rem] flex gap-2 items-center relative">
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onMouseMove={handleDrag} onTouchMove={handleDrag} className={`p-5 rounded-[1.5rem] transition-all ${isRecording ? (isCancelled ? 'bg-zinc-800 text-red-500 scale-125' : 'bg-red-500 text-white scale-125 shadow-lg shadow-red-500/30') : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                 {isCancelled ? '🗑️' : (isRecording ? '🛑' : '🎤')}
               </button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-xs" placeholder={isRecording ? (isCancelled ? "اترك للحذف" : "اسحب يمين للإلغاء ➡️") : "اكتب رسالة للورشة..."} value={msgText} onChange={(e) => setMsgText(e.target.value)} disabled={isRecording} />
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-7 py-4 rounded-2xl font-black text-xs hover:bg-yellow-400 hover:text-black transition-colors active:scale-95">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* عرض الصورة كاملة (Fullscreen) */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/98 z-[200] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewImage(null)}>
           <img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-zoomIn" />
           <button className="absolute top-8 left-8 text-white text-5xl hover:text-yellow-400 transition-colors">&times;</button>
        </div>
      )}

      {/* زر الـ (+) العائم */}
      {!['inbox', 'profile', 'support'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-[0_10px_40px_rgba(255,215,0,0.4)] text-4xl font-black z-50 border-4 border-white hover:scale-110 active:scale-90 transition-all">+</button>
      )}

    </div>
  );
}
