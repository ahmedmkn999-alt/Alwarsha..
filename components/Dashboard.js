import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";

// --- 1. مكون كارت المنتج (Product Card) ---
const ProductCard = ({ item, onViewImage, onChat, onAddToCart, isOwner, onDelete }) => {
  return (
    <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
      <div className="h-60 overflow-hidden relative">
        <img 
          src={item.image} 
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-700" 
          onClick={() => onViewImage(item.image)} 
          alt={item.name}
        />
        <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px] shadow-md z-10">
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center border hover:bg-zinc-200 transition-colors text-black no-underline">📞 اتصال</a>
            {!isOwner && (
              <button onClick={() => onChat(item)} className="flex-1 bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px] hover:bg-yellow-400 hover:text-black transition-colors">💬 دردشة</button>
            )}
          </div>
          {!isOwner && (
            <button onClick={() => onAddToCart(item)} className="w-full bg-yellow-400 text-black py-3 rounded-xl font-black text-[10px] shadow-md hover:scale-95 transition-all">🛒 إضافة للعربة والتوصيل</button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 2. المكون الرئيسي (Dashboard) ---
export default function Dashboard({ user }) {
  // --- States ---
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isBanned, setIsBanned] = useState(false); 
  const [toast, setToast] = useState({ show: false, msg: '' });

  // Data
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  // UI Logic
  const [readChats, setReadChats] = useState([]); 
  const [pinnedChats, setPinnedChats] = useState([]); 
  const [optionsModal, setOptionsModal] = useState({ show: false, targetId: '', targetName: '' });
  const [showModal, setShowModal] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [deliveryFees, setDeliveryFees] = useState({});

  // Inputs
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'قطع غيار' });
  const [msgText, setMsgText] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);
  const longPressTimer = useRef(null);

  const categories = [
    { id: 'parts', name: 'قطع غيار', img: '/parts.jpg' },
    { id: 'heater', name: 'سخانات', img: '/heater (1).jpg' },
    { id: 'ac', name: 'تكييفات', img: '/ac.jpg.webp' },
    { id: 'wash', name: 'غسالات', img: '/washing.jpg' },
    { id: 'fridge', name: 'ثلاجات', img: '/fridge.jpg' },
    { id: 'stove', name: 'بوتجازات', img: '/stove.jpg' },
    { id: 'fan', name: 'مراوح', img: '/fan.jpg' },
    { id: 'blender', name: 'خلاطات', img: '/blender.jpg' },
    { id: 'caps', name: 'كابات', img: '/caps.jpg' },
    { id: 'tools', name: 'عدة تصليح', img: '/tools.jpg' }
  ];

  // --- Effects ---
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    if(user?.uid) {
        onValue(ref(db, `users/${user.uid}/banned`), (snapshot) => setIsBanned(snapshot.val() === true));
        onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
            const data = snapshot.val();
            setMyMessages(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
        });
        onValue(ref(db, 'orders'), (snapshot) => {
            const data = snapshot.val();
            setOrders(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
        });
    }
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      setProducts(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
    });
    return () => clearTimeout(timer);
  }, [user]);

  // --- Functions ---
  const showToast = (message) => {
    setToast({ show: true, msg: message });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const addToCart = (product) => {
    const location = window.prompt("حدد عنوانك بالتفصيل (المنطقة/الشارع) لتحديد سعر المشوار:");
    if (!location) return showToast("⚠️ العنوان مطلوب");
    push(ref(db, 'orders'), {
        productId: product.id, productName: product.name,
        buyerId: user.uid, buyerName: user.displayName,
        sellerId: product.sellerId, buyerLocation: location,
        status: 'pending', deliveryFee: 0, date: new Date().toISOString()
    });
    showToast("🛒 تم الإرسال للبائع");
    setActiveTab('cart');
  };

  const handleTouchStart = (id, name) => { 
    longPressTimer.current = setTimeout(() => setOptionsModal({ show: true, targetId: id, targetName: name }), 800); 
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

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
             const d = { fromName: user.displayName, fromId: user.uid, voice: reader.result, date: new Date().toISOString() };
             push(ref(db, `messages/${messageModal.receiverId}`), d);
             push(ref(db, `messages/${user.uid}`), { ...d, toId: messageModal.receiverId });
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

  const filtered = products.filter(p => {
    const normalize = (str) => str?.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').trim() || "";
    const search = normalize(searchTerm);
    return (normalize(p.name).includes(search) || normalize(p.category).includes(search)) && (selectedCategory === 'all' || p.category === selectedCategory);
  });

  const uniqueConversations = [...new Map(myMessages.filter(m => m.fromId !== 'Admin' && m.toId !== 'Admin').map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()];

  // --- شاشة الحظر ---
  if (isBanned) return <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-black">🚫 تم حظرك من الورشة</div>;

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      {/* Toast */}
      {toast.show && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-400 text-black px-6 py-3 rounded-full font-black shadow-xl border-2 border-black">{toast.msg}</div>}

      {/* 1. شاشة الترحيب (Splash) بالاسم */}
      {showSplash && (
        <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center animate-fadeOut">
           <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce"><span className="text-black text-5xl font-black italic">W</span></div>
           <h1 className="text-yellow-400 font-black text-3xl mt-6 italic">AL-WARSHA</h1>
           <div className="mt-10 text-center animate-pulse">
              <p className="text-white text-xl font-bold">مرحباً بك يا</p>
              <p className="text-yellow-400 text-2xl font-black mt-2">{user?.displayName || "يا غالي"} ❤️</p>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
             <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black">W</div>
             <span className="font-black text-yellow-400 italic">الورشة</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setActiveTab('cart')} className={`p-2.5 rounded-xl ${activeTab === 'cart' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>🛒</button>
             <button onClick={() => setActiveTab('support')} className={`p-2.5 rounded-xl ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-2.5 rounded-xl relative ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                📩 {uniqueConversations.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">!</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full border border-zinc-700 overflow-hidden"><img src={user.photoURL} className="w-full h-full object-cover" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {/* 2. الصفحة الرئيسية والبحث */}
        {activeTab === 'home' && (
          <>
            <input className="w-full bg-zinc-200 border-none rounded-2xl p-4 text-center font-bold mb-4 outline-none focus:ring-2 focus:ring-yellow-400" placeholder="ابحث في الورشة..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={(e) => setSearchTerm(e.target.value)} />
            {showSearchSuggestions && (
                <div className="absolute top-[120px] left-8 right-8 bg-zinc-900 rounded-2xl p-3 shadow-2xl z-40 border border-zinc-800 animate-slideDown">
                    {categories.map(cat => (
                        <button key={cat.id} className="w-full text-right p-3 text-white font-bold hover:bg-zinc-800 rounded-xl" onClick={() => {setSearchTerm(cat.name); setShowSearchSuggestions(false);}}>🔍 {cat.name}</button>
                    ))}
                    <button onClick={() => setShowSearchSuggestions(false)} className="w-full text-red-500 text-xs font-black py-2">إغلاق ❌</button>
                </div>
            )}
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6">
                <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] flex flex-col items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}><span className="text-2xl mb-2">🌍</span><span className="text-[10px] font-black">الكل</span></button>
                {categories.map(cat => (
                    <div key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] relative overflow-hidden cursor-pointer border-2 transition-all ${selectedCategory === cat.name ? 'border-yellow-400' : 'border-transparent'}`}>
                        <img src={cat.img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center p-3 text-center"><span className="text-white text-[10px] font-black">{cat.name}</span></div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map(item => (
                    <ProductCard key={item.id} item={item} onViewImage={setViewImage} onChat={(it) => setMessageModal({ show: true, receiverId: it.sellerId, receiverName: it.sellerName })} onAddToCart={addToCart} isOwner={item.sellerId === user.uid} onDelete={(id) => remove(ref(db, `products/${id}`))} />
                ))}
            </div>
          </>
        )}

        {/* 3. البريد (Inbox) */}
        {activeTab === 'inbox' && (
            <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-2xl font-black mb-6 text-right pr-3 border-r-4 border-yellow-400 italic">بريد الورشة 📩</h2>
                {uniqueConversations.map(chat => (
                    <div key={chat.id} className="flex gap-2 items-center">
                        <button onClick={() => deleteConversation(chat.fromId === user.uid ? chat.toId : chat.fromId)} className="bg-red-50 text-red-500 w-12 h-20 rounded-2xl flex items-center justify-center">🗑️</button>
                        <div onTouchStart={() => handleTouchStart(chat.fromId === user.uid ? chat.toId : chat.fromId, chat.fromName)} onTouchEnd={handleTouchEnd} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId === user.uid ? chat.toId : chat.fromId, receiverName: chat.fromName })} className={`flex-1 bg-white p-6 rounded-[2rem] border flex items-center gap-5 cursor-pointer hover:border-yellow-400 shadow-sm ${pinnedChats.includes(chat.fromId === user.uid ? chat.toId : chat.fromId) ? 'border-yellow-400 bg-yellow-50' : ''}`}>
                            <div className="w-14 h-14 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black text-xl">{chat.fromName[0]}</div>
                            <div className="flex-1 text-right"><h4 className="font-black text-zinc-900">{chat.fromName}</h4><p className="text-xs text-zinc-400 line-clamp-1">{chat.text || "رسالة وسائط"}</p></div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* 4. العربة (Cart & Delivery) */}
        {activeTab === 'cart' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
                <h2 className="text-2xl font-black text-right border-r-4 border-yellow-400 pr-3 italic">متابعة العربة والتوصيل 🛒</h2>
                <div className="space-y-4">
                    <h3 className="font-bold text-zinc-500 text-[10px] px-2 uppercase tracking-widest">طلبات البيع الواردة لي</h3>
                    {orders.filter(o => o.sellerId === user.uid).reverse().map(order => (
                        <div key={order.id} className="bg-zinc-950 text-white p-6 rounded-[2.5rem] shadow-2xl space-y-4 border-2 border-yellow-400/10">
                            <div className="flex justify-between items-center"><h4 className="font-black text-yellow-400">{order.productName}</h4><span className="text-[9px] text-zinc-500">{order.buyerName}</span></div>
                            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800"><p className="text-[10px] italic">📍 المكان بالتفصيل: <span className="text-yellow-400 font-bold underline">{order.buyerLocation}</span></p></div>
                            {order.status === 'pending' ? (
                                <div className="flex gap-2 bg-zinc-800 p-2 rounded-2xl">
                                    <input type="number" placeholder="حدد سعر المشوار..." className="flex-1 bg-transparent p-2 text-xs outline-none font-bold" onChange={(e) => setDeliveryFees({...deliveryFees, [order.id]: e.target.value})} />
                                    <button onClick={() => update(ref(db, `orders/${order.id}`), { deliveryFee: deliveryFees[order.id], status: 'delivering' })} className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-black text-[10px]">تأكيد السعر</button>
                                </div>
                            ) : order.status === 'delivering' ? (
                                <button onClick={() => update(ref(db, `orders/${order.id}`), { status: 'delivered' })} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-[10px] animate-pulse">تم الوصول ✅ (العلامة الفارقة)</button>
                            ) : <div className="w-full bg-zinc-900 py-3 rounded-2xl font-black text-[10px] text-center text-green-400">📦 تمت البيعة بنجاح</div>}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 5. الدعم الفني (Support) */}
        {activeTab === 'support' && (
            <div className="max-w-md mx-auto text-center space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-black italic">الدعم الفني المباشر 🎧</h2>
                <textarea className="w-full bg-white border p-6 rounded-[2.5rem] min-h-[200px] outline-none font-bold shadow-inner" placeholder="اكتب مشكلتك هنا بوضوح..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
                <button onClick={() => { if(!supportMsg) return; push(ref(db, 'messages/Admin'), { fromName: user.displayName, fromId: user.uid, text: supportMsg, date: new Date().toISOString() }); setSupportMsg(''); showToast("✅ تم إرسال رسالتك للإدارة"); }} className="w-full bg-zinc-950 text-white py-5 rounded-[2rem] font-black shadow-xl">إرسال للمدير</button>
            </div>
        )}

        {/* 6. الملف الشخصي (Profile) */}
        {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto text-center space-y-6 animate-fadeIn">
                <div className="bg-white p-10 rounded-[3rem] border shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-400"></div>
                    <img src={user.photoURL} className="w-28 h-28 rounded-full mx-auto border-4 border-yellow-400 mb-4 object-cover shadow-lg" />
                    <h2 className="text-2xl font-black">{user.displayName}</h2>
                    <p className="text-zinc-400 text-xs mb-6 font-bold">{user.email}</p>
                    <button onClick={() => signOut(auth).then(() => window.location.reload())} className="bg-red-50 text-red-600 px-10 py-3 rounded-2xl text-xs font-black border border-red-100">تسجيل خروج من الورشة</button>
                </div>
                <h3 className="text-right font-black border-r-4 border-yellow-400 pr-3 italic">إعلاناتي المنشورة</h3>
                <div className="grid grid-cols-1 gap-6">
                    {products.filter(p => p.sellerId === user.uid).map(item => (
                        <ProductCard key={item.id} item={item} onViewImage={setViewImage} onChat={() => {}} onAddToCart={() => {}} isOwner={true} onDelete={(id) => remove(ref(db, `products/${id}`))} />
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* 7. زر إضافة منشور (Floating Button) */}
      {activeTab === 'home' && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-2xl text-4xl font-black z-50 border-4 border-white flex items-center justify-center animate-bounce">+</button>
      )}

      {/* مودال تنزيل المنشورات */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-[3rem] relative overflow-y-auto max-h-[90vh] shadow-2xl animate-slideUp">
            <button onClick={() => setShowModal(false)} className="absolute top-8 left-8 text-3xl text-zinc-300">&times;</button>
            <h2 className="text-xl font-black mb-8 text-center italic tracking-tighter text-zinc-800">نشر جديد في الورشة 🚀</h2>
            <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                setUploading(true);
                push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
                .then(() => { setUploading(false); setShowModal(false); showToast("✅ تم النشر بنجاح"); });
            }}>
              <div className="border-2 border-dashed border-zinc-200 rounded-3xl p-6 text-center cursor-pointer hover:bg-zinc-50 transition-all relative">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={(e) => {const reader = new FileReader(); reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result }); reader.readAsDataURL(e.target.files[0]);}} />
                 {newProduct.image ? <img src={newProduct.image} className="h-44 mx-auto rounded-2xl shadow-md object-contain" /> : <p className="text-xs text-zinc-400 py-10 font-bold">ارفع صورة المنتج 📸</p>}
              </div>
              <input placeholder="اسم الجهاز / القطعة" className="w-full bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select className="w-full bg-zinc-100 p-5 rounded-[1.5rem] font-bold outline-none" onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input placeholder="السعر" className="flex-1 bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold" onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <select className="bg-zinc-100 p-5 rounded-[1.5rem] font-bold outline-none" onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                    <option value="new">✨ جديد</option>
                    <option value="used">🛠️ مستعمل</option>
                </select>
              </div>
              <input placeholder="رقم الموبايل للتواصل" className="w-full bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold" onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
              <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-5 rounded-[2rem] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">نشر الآن في الورشة ✅</button>
            </form>
          </div>
        </div>
      )}

      {/* مودال الدردشة الشامل (صوت + صور + مسح) */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex flex-col md:p-6 backdrop-blur-md">
            <div className="p-6 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[3rem]">
               <h3 className="font-black text-lg">{messageModal.receiverName}</h3>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-4xl text-zinc-300 hover:text-black">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white flex flex-col no-scrollbar">
               {myMessages.filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId).sort((a,b) => new Date(a.date) - new Date(b.date)).map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-[1.5rem] shadow-sm max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-800'}`}>
                       {msg.image && <img src={msg.image} className="w-48 rounded-xl mb-2" />}
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-44" /> : <p className="text-sm font-bold">{msg.text}</p>}
                       <p className="text-[8px] opacity-40 mt-1 text-left">{new Date(msg.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t flex gap-2 items-center relative md:rounded-b-[3rem]">
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onMouseMove={handleDrag} onTouchMove={handleDrag} className={`p-5 rounded-[1.5rem] transition-all ${isRecording ? (isCancelled ? 'bg-zinc-800 text-red-500 scale-125' : 'bg-red-500 text-white animate-pulse scale-125') : 'bg-zinc-100 text-zinc-400'}`}>{isCancelled ? '🗑️' : (isRecording ? '🛑' : '🎤')}</button>
               <input className="flex-1 bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold text-xs" placeholder={isRecording ? "اسحب يمين للحذف ➡️" : "اكتب رسالة..."} value={msgText} onChange={(e) => setMsgText(e.target.value)} />
               <button onClick={() => { if(!msgText.trim()) return; const d = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() }; push(ref(db, `messages/${messageModal.receiverId}`), d); push(ref(db, `messages/${user.uid}`), { ...d, toId: messageModal.receiverId }); setMsgText(''); }} className="bg-zinc-950 text-white px-7 py-4 rounded-[1.5rem] font-black text-xs hover:bg-yellow-400 hover:text-black transition-colors">إرسال</button>
            </div>
        </div>
      )}

      {/* مودال عرض الصور (Zoom View) */}
      {viewImage && <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewImage(null)}><img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-zoomIn" /></div>}

      <footer className="text-center pb-10 pt-4 opacity-40"><p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.5em] italic">AHMED • EST. 2026</p></footer>
    </div>
  );
}
