import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove } from "firebase/database";
import { signOut } from "firebase/auth";

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' });
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState(null);

  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');
  
  // نظام الفويس الاحترافي
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);

  useEffect(() => {
    // منع الزوم التلقائي في المتصفحات
    const meta = document.createElement('meta');
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
    document.getElementsByTagName('head')[0].appendChild(meta);

    // جلب البيانات من قاعدة بيانات الورشة
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) loaded.push({ id: key, ...data[key] });
      setProducts(loaded.reverse()); 
    });

    if (user?.uid) {
      onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = [];
        for (const key in data) loadedMsgs.push({ id: key, ...data[key] });
        setMyMessages(loadedMsgs);
      });
    }
  }, [user]);

  // --- وظائف الفويس (سحب للإلغاء) ---
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

  // --- وظائف النشر ---
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name || !newProduct.phone) return alert("البيانات ناقصة");
    setUploading(true);
    push(ref(db, 'products'), { 
      ...newProduct, 
      sellerId: user.uid, 
      sellerName: user.displayName, 
      date: new Date().toISOString() 
    }).then(() => { 
      setUploading(false); 
      setShowModal(false); 
      setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' }); 
      alert("تم النشر في الورشة ✅");
    });
  };

  const filtered = products.filter(p => {
    const match = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'home') return match;
    if (activeTab === 'new') return match && p.condition === 'new';
    if (activeTab === 'used') return match && p.condition === 'used';
    return match;
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      
      {/* Header الورشة */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-2xl font-black italic text-yellow-400 cursor-pointer" onClick={() => setActiveTab('home')}>الورشة</div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2 rounded-xl ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-2 rounded-xl relative ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'text-zinc-500'}`}>
                📩 {myMessages.filter(m => m.fromId !== user.uid).length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center border border-black">!</span>}
             </button>
             <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className={`w-8 h-8 rounded-full border ${activeTab === 'profile' ? 'border-yellow-400' : 'border-zinc-700'}`} /></button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-2">
            <input className="w-full bg-zinc-900 border-none rounded-2xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-yellow-400" placeholder="ابحث في الورشة..." onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-[110px] z-40">
        <div className="flex justify-center p-2 gap-2 container mx-auto">
          <button onClick={() => setActiveTab('home')} className={`px-5 py-2 rounded-2xl font-black text-xs transition-all ${activeTab === 'home' ? 'bg-zinc-950 text-yellow-400' : 'text-zinc-400'}`}>الرئيسية</button>
          <button onClick={() => setActiveTab('new')} className={`px-5 py-2 rounded-2xl font-black text-xs transition-all ${activeTab === 'new' ? 'bg-zinc-950 text-yellow-400' : 'text-zinc-400'}`}>جديد</button>
          <button onClick={() => setActiveTab('used')} className={`px-5 py-2 rounded-2xl font-black text-xs transition-all ${activeTab === 'used' ? 'bg-zinc-950 text-yellow-400' : 'text-zinc-400'}`}>مستعمل</button>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-8">
        
        {/* بروفايل */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-[2.5rem] p-8 border mb-8 text-center shadow-sm">
              <img src={user.photoURL} className="w-20 h-20 rounded-full mx-auto border-4 border-yellow-400 mb-4" />
              <h2 className="text-xl font-black mb-4">{user.displayName}</h2>
              <button onClick={() => signOut(auth).then(() => window.location.reload())} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs border border-red-100">تسجيل الخروج</button>
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

        {/* عرض المنتجات */}
        {(activeTab === 'home' || activeTab === 'new' || activeTab === 'used') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-lg transition-all">
                <div className="h-60 overflow-hidden relative">
                  <img src={item.image} className="w-full h-full object-cover cursor-pointer" onClick={() => setViewImage(item.image)} />
                  <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px]">{item.condition === 'new' ? 'جديد' : 'مستعمل'}</div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-sm line-clamp-1">{item.name}</h3>
                    <div className="font-black text-yellow-600">{item.price} ج.م</div>
                  </div>
                  {user.uid !== item.sellerId ? (
                    <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="w-full bg-zinc-950 text-white py-3 rounded-2xl font-black text-xs hover:bg-yellow-400 hover:text-black transition-all">دردشة 💬</button>
                  ) : (
                    <div className="text-center py-2 bg-zinc-50 rounded-xl text-[9px] font-bold text-zinc-400">هذا إعلانك 👑</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* المحادثات */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">محادثات الورشة</h2>
            {[...new Map(myMessages.filter(m => m.fromId !== user.uid).map(m => [m.fromId, m])).values()].map(chat => (
              <div key={chat.id} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId, receiverName: chat.fromName })} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-yellow-400 transition-all">
                <div className="w-12 h-12 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black">{chat.fromName[0]}</div>
                <div className="flex-1 text-right">
                  <h4 className="font-black text-sm">{chat.fromName}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-1">{chat.voice ? "🎤 رسالة صوتية" : chat.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* مودال النشر (+) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl text-zinc-300 hover:text-black transition-colors">&times;</button>
             <h2 className="text-xl font-black mb-6">إعلان جديد في الورشة 🚀</h2>
             <form onSubmit={handlePublish} className="space-y-4">
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center cursor-pointer relative hover:bg-zinc-50">
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {newProduct.image ? <img src={newProduct.image} className="h-32 mx-auto rounded-xl shadow-md" /> : <p className="text-xs text-zinc-400 font-bold">ارفع صورة المنتج 📸</p>}
                </div>
                <input placeholder="اسم المنتج" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <div className="flex gap-2">
                   <input placeholder="السعر" className="flex-1 bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                   <select className="bg-zinc-100 p-4 rounded-xl font-bold text-sm" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                      <option value="new">جديد</option>
                      <option value="used">مستعمل</option>
                   </select>
                </div>
                <input placeholder="رقم الموبايل" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                <textarea placeholder="وصف المنتج (اختياري)" className="w-full bg-zinc-100 p-4 rounded-xl h-24 outline-none font-bold text-sm" value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
                <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all">
                    {uploading ? 'جاري النشر...' : 'نشر الآن في الورشة ✅'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* شاشة الشات المفتوحة */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center backdrop-blur-md p-0 md:p-6">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[3rem] flex flex-col shadow-2xl relative">
            <div className="p-5 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[3rem]">
               <h3 className="font-black text-lg">{messageModal.receiverName}</h3>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-4xl text-zinc-300 hover:text-black transition-colors">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
               {myMessages
                 .filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId)
                 .sort((a,b) => new Date(a.date) - new Date(b.date))
                 .map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-white text-zinc-800 rounded-tl-none border border-gray-100'}`}>
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-44" /> : <p className="text-sm font-bold leading-relaxed">{msg.text}</p>}
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t md:rounded-b-[3rem] flex gap-2 items-center relative">
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onMouseMove={handleDrag} onTouchMove={handleDrag} className={`p-5 rounded-[1.5rem] transition-all ${isRecording ? (isCancelled ? 'bg-zinc-800 text-red-500 scale-125 shadow-inner' : 'bg-red-500 text-white scale-125 shadow-lg') : 'bg-zinc-100 text-zinc-500'}`}>
                 {isCancelled ? '🗑️' : (isRecording ? '🛑' : '🎤')}
               </button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-xs" placeholder={isRecording ? (isCancelled ? "اترك للحذف" : "اسحب يمين للإلغاء ➡️") : "اكتب رسالة للورشة..."} value={msgText} onChange={(e) => setMsgText(e.target.value)} disabled={isRecording} />
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-yellow-400 hover:text-black transition-all">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* عرض الصورة كاملة */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/98 z-[200] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewImage(null)}>
           <img src={viewImage} className="max-w-full max-h-full rounded-xl shadow-2xl animate-zoomIn" />
           <button className="absolute top-8 left-8 text-white text-5xl hover:text-yellow-400 transition-colors">&times;</button>
        </div>
      )}

      {/* زر الـ (+) العائم */}
      {!['inbox', 'support', 'profile'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-[0_10px_40px_rgba(255,215,0,0.4)] text-4xl font-black z-50 border-4 border-white hover:scale-110 active:scale-95 transition-all">+</button>
      )}

    </div>
  );
}
