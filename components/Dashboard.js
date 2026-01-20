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
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);

  // قائمة الأقسام مع الصور (تأكد من وجودها في مجلد public)
  const categories = [
    { id: 'parts', name: 'قطع غيار', img: '/parts.jpg' },
    { id: 'heater', name: 'سخانات', img: '/Heater (1).jpg' },
    { id: 'ac', name: 'تكييفات', img: '/ac.jpg.webp' },
    { id: 'wash', name: 'غسالات', img: '/washing.jpg' },
    { id: 'fridge', name: 'ثلاجات', img: '/fridge.jpg' },
    { id: 'stove', name: 'بوتجازات', img: '/stove.jpg' },
    { id: 'fan', name: 'مراوح', img: '/fan.jpg' },
    { id: 'blender', name: 'خلاطات', img: '/blender.jpg' },
    { id: 'caps', name: 'كابات', img: '/caps.jpg' }
  ];

  useEffect(() => {
    // حل مشكلة الزوم في الموبايل
    const meta = document.createElement('meta');
    meta.name = "viewport"; 
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
    document.getElementsByTagName('head')[0].appendChild(meta);

    // جلب المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) loaded.push({ id: key, ...data[key] });
      setProducts(loaded.reverse()); 
    });

    // جلب الرسائل
    if (user?.uid) {
      onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = [];
        for (const key in data) loadedMsgs.push({ id: key, ...data[key] });
        setMyMessages(loadedMsgs);
      });
    }
  }, [user]);

  // --- وظائف التحكم ---
  const handleSupportSend = () => {
    if (!supportMsg.trim()) return alert("اكتب رسالتك أولاً");
    push(ref(db, 'support'), {
      userId: user.uid, userName: user.displayName, msg: supportMsg, date: new Date().toISOString()
    }).then(() => { setSupportMsg(''); alert("تم الإرسال لدعم الورشة ✅"); });
  };

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
    .then(() => { 
      setUploading(false); setShowModal(false); 
      setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'تكييفات' }); 
      alert("تم النشر في الورشة ✅");
    });
  };

  // الفلترة بناءً على الحالة والقسم والبحث
  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchTab = activeTab === 'home' || p.condition === activeTab;
    return matchSearch && matchCategory && matchTab;
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      
      {/* 1. Header الورشة الثابت */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-2xl font-black italic text-yellow-400 cursor-pointer" onClick={() => {setActiveTab('home'); setSelectedCategory('all');}}>الورشة</div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-2.5 rounded-xl relative transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                📩 {myMessages.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">!</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className={`active:scale-90 transition-transform ${activeTab === 'profile' ? 'ring-2 ring-yellow-400' : ''}`}>
                <img src={user.photoURL} className="w-9 h-9 rounded-full border border-zinc-700" alt="profile" />
             </button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-3 relative">
            <input className="w-full bg-zinc-900 border-none rounded-2xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-yellow-400 font-bold text-center" placeholder="ابحث عن أجهزة كهربائية..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={(e) => setSearchTerm(e.target.value)} />
            {showSearchSuggestions && (
              <div className="absolute top-full left-4 right-4 bg-zinc-900 rounded-2xl mt-2 p-2 shadow-2xl z-[60] border border-zinc-800">
                {categories.map(cat => (
                  <button key={cat.id} className="w-full text-right p-3 text-sm hover:bg-zinc-800 rounded-xl" onClick={() => {setSearchTerm(cat.name); setShowSearchSuggestions(false);}}>🔍 {cat.name}</button>
                ))}
                <button onClick={() => setShowSearchSuggestions(false)} className="w-full p-2 text-[10px] text-yellow-400 font-bold border-t border-zinc-800 mt-1">إغلاق ×</button>
              </div>
            )}
        </div>
      </header>

      {/* 2. شريط الأقسام (صور 4x6) */}
      {['home', 'new', 'used'].includes(activeTab) && (
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
      )}

      <main className="container mx-auto p-4 md:p-8 animate-fadeIn">
        
        {/* 3. الصفحة الرئيسية / جديد / مستعمل */}
        {['home', 'new', 'used'].includes(activeTab) && (
          <>
            <div className="flex justify-center gap-3 mb-8">
              <button onClick={() => setActiveTab('home')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'home' ? 'bg-zinc-950 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white text-zinc-400 border'}`}>الكل</button>
              <button onClick={() => setActiveTab('new')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'new' ? 'bg-zinc-950 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white text-zinc-400 border'}`}>جديد ✨</button>
              <button onClick={() => setActiveTab('used')} className={`px-8 py-2.5 rounded-2xl font-black text-xs transition-all ${activeTab === 'used' ? 'bg-zinc-950 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white text-zinc-400 border'}`}>مستعمل 🛠️</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map(item => (
                <div key={item.id} className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className="h-60 overflow-hidden relative">
                    <img src={item.image} className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105" onClick={() => setViewImage(item.image)} />
                    <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px] shadow-md">{item.category}</div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-black text-sm mb-4 line-clamp-1">{item.name} <span className="text-[10px] text-zinc-300 font-normal">({item.condition === 'new' ? 'جديد' : 'مستعمل'})</span></h3>
                    <div className="font-black text-yellow-600 italic mb-4">{item.price} ج.م</div>
                    {user.uid !== item.sellerId ? (
                      <div className="flex gap-2">
                        <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center flex items-center justify-center gap-1 hover:bg-zinc-200 transition-colors">📞 اتصال</a>
                        <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px] hover:bg-yellow-400 hover:text-black transition-colors">💬 دردشة</button>
                      </div>
                    ) : (
                      <div className="text-center py-2 bg-zinc-50 rounded-xl text-[9px] font-bold text-zinc-400">إعلانك الخاص 👑</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 4. قسم المحادثات (البريد) */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black mb-6 pr-3 border-r-4 border-yellow-400">محادثات الورشة</h2>
            {myMessages.length === 0 ? (
              <p className="text-center py-20 text-zinc-400 italic">لا توجد رسائل حالياً..</p>
            ) : (
              [...new Map(myMessages.filter(m => m.fromId !== user.uid || m.toId).map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()].map(chat => (
                <div key={chat.id} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId === user.uid ? chat.toId : chat.fromId, receiverName: chat.fromName })} className="bg-white p-6 rounded-[2rem] border flex items-center gap-5 cursor-pointer hover:border-yellow-400 transition-all shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black text-xl">{chat.fromName[0]}</div>
                  <div className="flex-1 text-right">
                    <h4 className="font-black text-zinc-900">{chat.fromName === 'Admin' ? 'إدارة الورشة' : chat.fromName}</h4>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-1">{chat.text || "🎤 رسالة صوتية"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. قسم الدعم الفني */}
        {activeTab === 'support' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] border text-center shadow-lg">
            <h2 className="text-xl font-black mb-4 italic">دعم الورشة 🎧</h2>
            <textarea className="w-full bg-zinc-50 border rounded-2xl p-4 text-sm mb-4 outline-none min-h-[150px] font-bold" placeholder="اكتب مشكلتك هنا..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
            <button onClick={handleSupportSend} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform">إرسال للمراجعة</button>
          </div>
        )}

        {/* 6. الصفحة الشخصية */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-[2.5rem] p-8 border mb-8 text-center shadow-sm">
              <img src={user.photoURL} className="w-20 h-20 rounded-full mx-auto border-4 border-yellow-400 mb-4" />
              <h2 className="text-xl font-black mb-2">{user.displayName}</h2>
              <p className="text-zinc-400 text-xs mb-6">{user.email}</p>
              <button onClick={() => signOut(auth).then(() => window.location.reload())} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs border border-red-100">تسجيل الخروج</button>
            </div>
            <h3 className="font-black mb-4 pr-3 border-r-4 border-yellow-400">إعلاناتي في الورشة</h3>
            <div className="grid grid-cols-1 gap-4">
                {products.filter(p => p.sellerId === user.uid).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-3xl border flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <img src={item.image} className="w-16 h-16 rounded-2xl object-cover" alt={item.name} />
                            <span className="font-bold text-sm">{item.name}</span>
                        </div>
                        <button onClick={() => remove(ref(db, `products/${item.id}`))} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-all">🗑️</button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* مودالات: النشر، الشات، عرض الصور (نفس الكود الشغال السابق) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] relative overflow-y-auto max-h-[90vh] shadow-2xl">
             <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl text-zinc-300 hover:text-black">&times;</button>
             <h2 className="text-xl font-black mb-6 text-center">إضافة جهاز للورشة 🚀</h2>
             <form onSubmit={handlePublish} className="space-y-4">
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={(e) => {
                       const file = e.target.files[0];
                       const reader = new FileReader();
                       reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
                       reader.readAsDataURL(file);
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {newProduct.image ? <img src={newProduct.image} className="h-32 mx-auto rounded-xl shadow-md" /> : <p className="text-xs text-zinc-400 font-bold">ارفع صورة الجهاز 📸</p>}
                </div>
                <input placeholder="اسم الجهاز" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <select className="w-full bg-zinc-100 p-4 rounded-xl font-bold text-sm" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                     {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <div className="flex gap-2">
                   <input placeholder="السعر" className="flex-1 bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                   <select className="bg-zinc-100 p-4 rounded-xl font-bold text-sm" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                      <option value="new">جديد</option><option value="used">مستعمل</option>
                   </select>
                </div>
                <input placeholder="رقم الموبايل" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black shadow-lg">نشر الآن ✅</button>
             </form>
          </div>
        </div>
      )}

      {!['inbox', 'profile', 'support'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-2xl text-4xl font-black z-50 border-4 border-white active:scale-95 transition-transform">+</button>
      )}

      {viewImage && (
        <div className="fixed inset-0 bg-black/98 z-[200] flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
           <img src={viewImage} className="max-w-full max-h-full rounded-xl shadow-2xl" alt="full view" />
        </div>
      )}

    </div>
  );
}
