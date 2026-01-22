import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";

// --- 1. كومبوننت الكارت ---
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center border hover:bg-zinc-200 transition-colors text-black no-underline">📞 اتصال</a>
            {!isOwner && (
              <button onClick={() => onChat(item)} className="flex-1 bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px] hover:bg-yellow-400 hover:text-black transition-colors">💬 دردشة</button>
            )}
          </div>
          {!isOwner && (
            <button onClick={() => onAddToCart(item)} className="w-full bg-yellow-400 text-black py-3 rounded-xl font-black text-[10px] shadow-md hover:bg-black hover:text-yellow-400 transition-all">🛒 طلب توصيل للمنزل</button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 2. الكومبوننت الرئيسي ---
export default function Dashboard({ user }) {
  // States
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isBanned, setIsBanned] = useState(false); 
  const [showBannedChat, setShowBannedChat] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // Data
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  // UI
  const [readChats, setReadChats] = useState([]); 
  const [pinnedChats, setPinnedChats] = useState([]); 
  const [optionsModal, setOptionsModal] = useState({ show: false, targetId: '', targetName: '' });
  const [showModal, setShowModal] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  
  // Inputs
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'قطع غيار' });
  const [msgText, setMsgText] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deliveryFees, setDeliveryFees] = useState({});

  // Audio Logic
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

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    
    if(user?.uid) {
        // فحص حالة الحظر
        onValue(ref(db, `users/${user.uid}/banned`), (snapshot) => setIsBanned(snapshot.val() === true));
        // جلب الرسائل
        onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
            const data = snapshot.val();
            setMyMessages(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
        });
        // جلب الطلبات
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

  // Functions
  const showToast = (message) => {
    setToast({ show: true, msg: message });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleTouchStart = (id, name) => { 
    longPressTimer.current = setTimeout(() => setOptionsModal({ show: true, targetId: id, targetName: name }), 800); 
  };
  
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const deleteConversation = (otherId) => {
    if(!window.confirm("مسح المحادثة؟")) return;
    myMessages.forEach(msg => { 
        if (msg.fromId === otherId || msg.toId === otherId) remove(ref(db, `messages/${user.uid}/${msg.id}`)); 
    });
    showToast("🗑️ تم الحذف");
  };

  // وظائف العربة الجديدة
  const addToCart = (product) => {
    const location = window.prompt("حدد مكان التوصيل (العنوان بالتفصيل):");
    if (!location) return showToast("⚠️ العنوان مطلوب");
    push(ref(db, 'orders'), {
        productId: product.id, productName: product.name,
        buyerId: user.uid, buyerName: user.displayName,
        sellerId: product.sellerId, buyerLocation: location,
        status: 'pending', deliveryFee: 0, date: new Date().toISOString()
    });
    showToast("✅ تم الطلب");
    setActiveTab('cart');
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

  const filtered = products.filter(p => {
    const normalize = (str) => str?.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').trim() || "";
    const search = normalize(searchTerm);
    return (normalize(p.name).includes(search) || normalize(p.category).includes(search)) && (selectedCategory === 'all' || p.category === selectedCategory);
  });

  const uniqueConversations = [...new Map(myMessages.filter(m => m.fromId !== 'Admin' && m.toId !== 'Admin').map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()];

  // شاشة الحظر
  if (isBanned) return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 text-center font-cairo" dir="rtl">
          <h1 className="text-yellow-400 text-4xl font-black mb-4 italic tracking-tighter">AL-WARSHA</h1>
          <h2 className="text-white text-2xl font-bold mb-2 underline decoration-red-600">تم حظرك يا {user.displayName} 🚫</h2>
          <button onClick={() => setShowBannedChat(true)} className="bg-white text-black px-10 py-4 rounded-full font-black mt-4">💬 تواصل مع الإدارة</button>
          {showBannedChat && (
            <div className="fixed inset-0 bg-black z-[10000] flex items-center justify-center">
               <div className="bg-white w-full max-w-lg h-full flex flex-col overflow-hidden">
                  <div className="p-6 bg-zinc-950 text-white flex justify-between items-center"><span>دردشة الدعم</span><button onClick={() => setShowBannedChat(false)} className="text-3xl">&times;</button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
                     {myMessages.filter(m => m.fromId === 'Admin' || m.toId === 'Admin').map((msg, i) => (
                        <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                           <div className={`p-4 rounded-xl shadow-sm ${msg.fromId === user.uid ? 'bg-zinc-900 text-white' : 'bg-white border'}`}>{msg.text}</div>
                        </div>
                     ))}
                  </div>
                  <div className="p-5 bg-white border-t flex gap-2">
                     <input className="flex-1 bg-zinc-100 p-4 rounded-xl outline-none" placeholder="رسالة للمدير..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
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
        <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce"><span className="text-black text-5xl font-black italic">W</span></div>
           <h1 className="text-yellow-400 font-black text-3xl mt-6 italic tracking-tighter">AL-WARSHA</h1>
           <p className="text-zinc-500 text-[10px] mt-2 font-bold tracking-[0.4em]">EST. 2026</p>
        </div>
      )}

      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-black"><span className="text-black text-xl font-black italic">W</span></div>
              <div className="text-xl font-black italic text-yellow-400 tracking-tighter">الورشة</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setActiveTab('cart')} className={`p-2.5 rounded-xl ${activeTab === 'cart' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>🛒</button>
             <button onClick={() => setActiveTab('support')} className={`p-2.5 rounded-xl ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-2.5 rounded-xl relative ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>📩</button>
             <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className="w-9 h-9 rounded-full border border-zinc-700 object-cover" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {activeTab === 'home' && (
          <>
            <div className="container mx-auto px-4 pb-3 relative">
                <input className="w-full bg-zinc-200 border-none rounded-2xl p-4 text-xs font-bold text-center mb-4 shadow-inner" placeholder="ابحث في الورشة..." value={searchTerm} onFocus={() => setShowSearchSuggestions(true)} onChange={(e) => setSearchTerm(e.target.value)} />
                {showSearchSuggestions && (
                    <div className="absolute top-[60px] left-4 right-4 bg-zinc-900 rounded-2xl p-2 shadow-2xl z-[60] border border-zinc-800">
                        {categories.map(cat => (
                            <button key={cat.id} className="w-full text-right p-3 text-sm text-white font-bold hover:bg-zinc-800 rounded-xl" onClick={() => {setSearchTerm(cat.name); setShowSearchSuggestions(false);}}>🔍 {cat.name}</button>
                        ))}
                        <button onClick={() => setShowSearchSuggestions(false)} className="w-full text-red-500 text-[10px] font-black py-2">إغلاق القائمة ❌</button>
                    </div>
                )}
                <div className="bg-white shadow-sm border-b py-4 overflow-x-auto no-scrollbar flex gap-4 px-4">
                    <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] flex flex-col items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}><span className="text-2xl mb-2">🌍</span><span className="text-[10px] font-black">الكل</span></button>
                    {categories.map(cat => (
                        <div key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 w-24 aspect-[4/6] rounded-[1.5rem] relative overflow-hidden border-2 transition-all ${selectedCategory === cat.name ? 'border-yellow-400 scale-105 shadow-xl' : 'border-transparent opacity-80'}`}>
                            <img src={cat.img} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center p-3 text-center"><span className="text-white text-[10px] font-black">{cat.name}</span></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                {filtered.map(item => (
                    <ProductCard key={item.id} item={item} onViewImage={setViewImage} onChat={(it) => setMessageModal({ show: true, receiverId: it.sellerId, receiverName: it.sellerName })} onAddToCart={addToCart} isOwner={item.sellerId === user.uid} onDelete={(id) => confirm("حذف؟") && remove(ref(db, `products/${id}`))} />
                ))}
            </div>
          </>
        )}

        {activeTab === 'cart' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-black text-right border-r-4 border-yellow-400 pr-3 italic">متابعة الطلبات 🛒</h2>
            
            <div className="space-y-4">
                <h3 className="font-bold text-zinc-400 text-[10px] px-2 uppercase tracking-widest">طلبات شراء أجهزتي</h3>
                {orders.filter(o => o.sellerId === user.uid).reverse().map(order => (
                    <div key={order.id} className="bg-zinc-950 text-white p-6 rounded-[2.5rem] shadow-2xl space-y-4 border-2 border-yellow-400/10">
                        <div className="flex justify-between items-center"><h4 className="font-black text-yellow-400">{order.productName}</h4><span className="text-[9px] text-zinc-500">{order.buyerName}</span></div>
                        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800"><p className="text-[10px] italic">المكان: <span className="text-yellow-400 font-bold underline">{order.buyerLocation}</span></p></div>
                        {order.status === 'pending' ? (
                            <div className="flex gap-2 bg-zinc-800 p-2 rounded-2xl">
                                <input type="number" placeholder="سعر التوصيل..." className="flex-1 bg-transparent p-2 text-xs outline-none font-bold" onChange={(e) => setDeliveryFees({...deliveryFees, [order.id]: e.target.value})} />
                                <button onClick={() => update(ref(db, `orders/${order.id}`), { deliveryFee: deliveryFees[order.id], status: 'delivering' })} className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-black text-[10px]">تأكيد</button>
                            </div>
                        ) : order.status === 'delivering' ? (
                            <button onClick={() => update(ref(db, `orders/${order.id}`), { status: 'delivered' })} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-[10px] animate-pulse">تم الوصول ✅</button>
                        ) : (
                            <div className="w-full bg-zinc-900 py-3 rounded-2xl font-black text-[10px] text-center text-green-400 border border-green-400/20">📦 تمت البيعة بنجاح (تم الوصول)</div>
                        )}
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-zinc-400 text-[10px] px-2 uppercase tracking-widest">مشترياتي</h3>
                {orders.filter(o => o.buyerId === user.uid).reverse().map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-[2rem] border shadow-sm border-r-8 border-r-yellow-400">
                        <div className="text-right">
                            <h4 className="font-black text-sm">{order.productName}</h4>
                            <p className="text-[9px] text-zinc-400">الحالة: {order.status === 'pending' ? '⏳ بانتظار السعر' : order.status === 'delivering' ? '🚚 جاري التوصيل' : '✅ تم الوصول'}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* كود شاشة الدردشة inbox + الدعم support يظل بنفس قوة منطق الصوت والصور */}
        {activeTab === 'inbox' && (
            <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-2xl font-black mb-6 text-right pr-3 border-r-4 border-yellow-400 italic">بريد الورشة 📩</h2>
                {uniqueConversations.reverse().map(chat => (
                    <div key={chat.id} className="flex gap-2 items-center">
                        <button onClick={() => deleteConversation(chat.fromId === user.uid ? chat.toId : chat.fromId)} className="bg-red-50 text-red-500 w-12 h-20 rounded-2xl flex items-center justify-center shadow-sm">🗑️</button>
                        <div onTouchStart={() => handleTouchStart(chat.fromId === user.uid ? chat.toId : chat.fromId, chat.fromName)} onTouchEnd={handleTouchEnd} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId === user.uid ? chat.toId : chat.fromId, receiverName: chat.fromName })} className={`flex-1 bg-white p-6 rounded-[2rem] border flex items-center gap-5 cursor-pointer shadow-sm ${pinnedChats.includes(chat.fromId === user.uid ? chat.toId : chat.fromId) ? 'border-yellow-400 bg-yellow-50' : ''}`}>
                            <div className="w-14 h-14 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black text-xl">{chat.fromName[0]}</div>
                            <div className="flex-1 text-right"><h4 className="font-black text-zinc-900">{chat.fromName}</h4><p className="text-xs text-zinc-400 line-clamp-1">{chat.text || "رسالة وسائط"}</p></div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

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
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t flex gap-2 items-center relative">
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onMouseMove={handleDrag} onTouchMove={handleDrag} className={`p-5 rounded-[1.5rem] ${isRecording ? (isCancelled ? 'bg-zinc-800 text-red-500' : 'bg-red-500 text-white animate-pulse') : 'bg-zinc-100 text-zinc-400'}`}>{isCancelled ? '🗑️' : '🎤'}</button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-xs" placeholder={isRecording ? "اسحب يمين للحذف ➡️" : "اكتب رسالة..."} value={msgText} onChange={(e) => setMsgText(e.target.value)} />
               <button onClick={() => { if(!msgText.trim()) return; const d = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() }; push(ref(db, `messages/${messageModal.receiverId}`), d); push(ref(db, `messages/${user.uid}`), { ...d, toId: messageModal.receiverId }); setMsgText(''); }} className="bg-zinc-950 text-white px-7 py-4 rounded-2xl font-black">إرسال</button>
            </div>
        </div>
      )}

      {/* الأزرار العائمة */}
      {!['cart', 'inbox', 'profile', 'support'].includes(activeTab) && <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-2xl text-4xl font-black z-[100] border-4 border-white flex items-center justify-center shadow-yellow-400/30">+</button>}
      
      {/* مودال النشر */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] relative overflow-y-auto max-h-[90vh] shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl text-zinc-300">&times;</button>
            <h2 className="text-xl font-black mb-6 text-center italic tracking-tighter">إضافة منشور جديد 🚀</h2>
            <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                setUploading(true);
                push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
                .then(() => { setUploading(false); setShowModal(false); showToast("✅ تم النشر بنجاح"); });
            }}>
              <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center cursor-pointer relative hover:bg-zinc-50">
                <input type="file" accept="image/*" onChange={(e) => {const reader = new FileReader(); reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result }); reader.readAsDataURL(e.target.files[0]);}} className="absolute inset-0 w-full h-full opacity-0" />
                {newProduct.image ? <img src={newProduct.image} className="h-40 mx-auto rounded-xl object-contain" /> : <p className="text-xs text-zinc-400 py-10">ارفع صورة 📸</p>}
              </div>
              <input placeholder="اسم المنتج" className="w-full bg-zinc-100 p-4 rounded-xl outline-none font-bold" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select className="w-full bg-zinc-100 p-4 rounded-xl font-bold" onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black shadow-lg">نشر الآن ✅</button>
            </form>
          </div>
        </div>
      )}
      
      <footer className="text-center pb-10 pt-4 opacity-40"><p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.4em] italic">AHMED • EST. 2026</p></footer>
    </div>
  );
}
