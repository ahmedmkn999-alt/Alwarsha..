import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";

// --- 1. كارت المنتج (المحمي ضد الأخطاء) ---
const ProductCard = ({ item, onViewImage, onChat, onAddToCart, isOwner, onDelete }) => {
  // حماية: لو المنتج مش موجود ما ترسمش حاجة
  if (!item) return null;
  const isSold = item.status === 'sold';

  return (
    <div className={`bg-white rounded-[2rem] border border-zinc-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative ${isSold ? 'opacity-60 grayscale' : ''}`}>
      <div className="h-64 overflow-hidden relative bg-zinc-50">
        <img 
          src={item.image || 'https://via.placeholder.com/300'} 
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-700" 
          onClick={() => onViewImage(item.image)} 
          alt={item.name || 'منتج'}
        />
        <div className="absolute top-4 right-4 bg-yellow-400 text-black px-4 py-1 rounded-full font-black text-[10px] shadow-lg z-10">
          {item.category || 'عام'}
        </div>
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 backdrop-blur-[2px]">
             <div className="bg-red-500 text-white px-8 py-3 rounded-xl font-black text-sm rotate-[-10deg] shadow-2xl border-4 border-white tracking-widest">تم البيع 🚫</div>
          </div>
        )}
        {isOwner && (
            <button onClick={() => onDelete(item.id)} className="absolute top-4 left-4 bg-white/90 text-red-600 w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold z-10 hover:scale-110 active:scale-90 transition-all">🗑️</button>
        )}
      </div>
      <div className="p-6 text-right">
        <h3 className="font-black text-zinc-900 text-base mb-1 line-clamp-1">{item.name || 'بدون اسم'}</h3>
        <p className="text-[10px] text-zinc-400 font-bold mb-4">الحالة: {item.condition === 'new' ? 'جديد ✨' : 'مستعمل 🛠️'}</p>
        
        <div className="flex items-center justify-between mb-4 bg-zinc-50 p-3 rounded-2xl">
            <span className="font-black text-yellow-600 text-xl">{item.price || '0'} ج.م</span>
            <span className="text-[10px] text-zinc-400">السعر نهائي</span>
        </div>

        <div className="flex flex-col gap-2">
          {!isSold ? (
             <>
               <div className="flex gap-2">
                 <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-[10px] font-black text-center shadow-md hover:bg-zinc-800 transition-all no-underline">📞 اتصال</a>
                 {!isOwner && (
                   <button onClick={() => onChat(item)} className="flex-1 bg-yellow-400 text-black py-3 rounded-xl font-black text-[10px] shadow-md hover:bg-yellow-300 transition-all">💬 دردشة</button>
                 )}
               </div>
               {!isOwner && (
                 <button onClick={() => onAddToCart(item)} className="w-full bg-white border-2 border-zinc-100 text-zinc-900 py-3 rounded-xl font-black text-[10px] hover:bg-zinc-50 transition-all">🛒 طلب توصيل للبيت</button>
               )}
             </>
          ) : <button disabled className="w-full bg-zinc-200 text-zinc-400 py-4 rounded-xl font-black text-xs cursor-not-allowed">هذا المنتج لم يعد متاحاً</button>}
        </div>
      </div>
    </div>
  );
};

// --- 2. المكون الرئيسي ---
export default function Dashboard({ user }) {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });

  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [addressModal, setAddressModal] = useState({ show: false, product: null, location: '' });
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'قطع غيار' });
  const [deliveryFees, setDeliveryFees] = useState({});
  const [uploading, setUploading] = useState(false);
  const [msgText, setMsgText] = useState('');

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
    
    // استخدام try-catch داخل الـ effect لمنع الكراش
    try {
        if(user?.uid) {
            onValue(ref(db, 'orders'), (snap) => {
                const data = snap.val() || {}; // حماية ضد الـ null
                setOrders(Object.entries(data).map(([id, val]) => ({ id, ...val })));
            });
            onValue(ref(db, `messages/${user.uid}`), (snap) => {
                const data = snap.val() || {}; // حماية ضد الـ null
                setMyMessages(Object.entries(data).map(([id, val]) => ({ id, ...val })));
            });
        }
        onValue(ref(db, 'products'), (snap) => {
            const data = snap.val() || {}; // حماية ضد الـ null
            setProducts(Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse());
        });
    } catch (err) {
        console.error("Firebase Error handled:", err);
    }

    return () => clearTimeout(timer);
  }, [user]);

  const showToast = (message) => {
    setToast({ show: true, msg: message });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const filtered = products.filter(p => {
    if (!p) return false;
    const normalize = (str) => str?.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').trim() || "";
    const search = normalize(searchTerm);
    return normalize(p.name).includes(search) || normalize(p.category).includes(search);
  });

  // حماية قائمة المحادثات من البيانات البايظة
  const uniqueConversations = myMessages 
    ? [...new Map(myMessages.filter(m => m && m.fromId !== 'Admin' && m.toId !== 'Admin').map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()]
    : [];

  // دالة الوقت الآمنة جداً (Anti-Crash)
  const formatTime = (dateString) => {
      try {
          if (!dateString) return "";
          return new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } catch (e) {
          return "";
      }
  };

  // لو مفيش يوزر لسه، اظهر شاشة تحميل بدل ما يضرب Error
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-black text-yellow-400 font-black animate-pulse">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24 font-cairo select-none overflow-x-hidden" dir="rtl">
      {toast.show && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black shadow-2xl border-4 border-white animate-bounce">{toast.msg}</div>}

      {showSplash && (
        <div className="fixed inset-0 bg-zinc-950 z-[999] flex flex-col items-center justify-center">
           <div className="w-28 h-28 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce shadow-[0_0_50px_rgba(250,204,21,0.5)]"><span className="text-black text-6xl font-black italic">W</span></div>
           <h1 className="text-white font-black text-4xl mt-8 italic tracking-tighter">AL-WARSHA</h1>
           <div className="mt-8 text-center animate-pulse">
              <p className="text-zinc-500 text-sm font-bold tracking-[0.3em] uppercase">Welcome Back</p>
              <p className="text-yellow-400 text-xl font-black mt-2">{user?.displayName || 'يا غالي'}</p>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-zinc-100 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
             <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-yellow-400 font-black group-hover:scale-110 transition-transform">W</div>
             <span className="font-black text-zinc-900 italic text-xl tracking-tighter">الورشة</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('cart')} className={`p-3 rounded-2xl transition-all ${activeTab === 'cart' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/30' : 'bg-zinc-100 text-zinc-400'}`}>🛒</button>
             <button onClick={() => setActiveTab('support')} className={`p-3 rounded-2xl transition-all ${activeTab === 'support' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/30' : 'bg-zinc-100 text-zinc-400'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-3 rounded-2xl relative transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/30' : 'bg-zinc-100 text-zinc-400'}`}>
                📩 {uniqueConversations.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">!</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className="w-11 h-11 rounded-2xl border-2 border-white shadow-md overflow-hidden active:scale-90 transition-transform"><img src={user.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {activeTab === 'home' && (
          <>
            <div className="relative mb-8">
                <input className="w-full bg-white border-none rounded-[2rem] p-5 text-center font-bold text-zinc-700 shadow-sm focus:ring-4 focus:ring-yellow-100 transition-all outline-none" placeholder="عايز تشتري إيه النهاردة؟" onChange={(e) => setSearchTerm(e.target.value)} />
                <span className="absolute left-5 top-5 text-2xl opacity-20">🔍</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8 px-2">
                <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 w-24 h-32 rounded-[2rem] flex flex-col items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'border-yellow-400 bg-yellow-400 shadow-lg shadow-yellow-400/30 scale-105' : 'border-white bg-white shadow-sm opacity-60'}`}><span className="text-3xl mb-2">🌍</span><span className="text-[10px] font-black">الكل</span></button>
                {categories.map(cat => (
                    <div key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 w-24 h-32 rounded-[2rem] relative overflow-hidden cursor-pointer border-4 transition-all shadow-md ${selectedCategory === cat.name ? 'border-yellow-400 scale-105' : 'border-white opacity-80'}`}>
                        <img src={cat.img} className="w-full h-full object-cover" alt={cat.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center p-3 text-center"><span className="text-white text-[10px] font-black">{cat.name}</span></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(item => (
                    <ProductCard key={item.id} item={item} onViewImage={setViewImage} onChat={(it) => setMessageModal({ show: true, receiverId: it.sellerId, receiverName: it.sellerName })} onAddToCart={(p) => setAddressModal({ show: true, product: p, location: '' })} isOwner={item.sellerId === user.uid} onDelete={(id) => confirm("حذف؟") && remove(ref(db, `products/${id}`))} />
                ))}
            </div>
          </>
        )}

        {activeTab === 'inbox' && (
            <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
                <h2 className="text-3xl font-black mb-8 text-right px-4">الرسائل <span className="text-yellow-400">.</span></h2>
                {uniqueConversations.length === 0 ? <div className="text-center py-20 opacity-30"><span className="text-6xl block mb-4">📭</span><p className="font-bold">مفيش رسايل لسه</p></div> :
                  uniqueConversations.map(chat => (
                    <div key={chat.id} className="flex gap-3 items-center group">
                        <div onClick={() => setMessageModal({ show: true, receiverId: chat.fromId === user.uid ? chat.toId : chat.fromId, receiverName: chat.fromName })} className="flex-1 bg-white p-5 rounded-[2.5rem] flex items-center gap-5 cursor-pointer hover:shadow-xl transition-all border border-transparent hover:border-yellow-400">
                            <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center font-black text-2xl shadow-inner">{chat.fromName?.[0] || '?'}</div>
                            <div className="flex-1 text-right">
                                <h4 className="font-black text-zinc-900 text-lg">{chat.fromName || 'مستخدم'}</h4>
                                <p className="text-xs text-zinc-400 font-bold mt-1 line-clamp-1">{chat.text || "رسالة صوتية/صورة"}</p>
                            </div>
                            <span className="text-2xl text-zinc-200 group-hover:text-yellow-400 transition-colors">💬</span>
                        </div>
                        <button onClick={() => { if(confirm("مسح المحادثة؟")) remove(ref(db, `messages/${user.uid}/${chat.id}`)); }} className="bg-red-50 text-red-500 w-14 h-24 rounded-3xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">🗑️</button>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'cart' && (
            <div className="max-w-2xl mx-auto space-y-10 animate-fadeIn">
                <h2 className="text-3xl font-black text-right px-4">متابعة الطلبات <span className="text-yellow-400">.</span></h2>
                
                {/* قسم البائع */}
                <div className="space-y-4">
                    <h3 className="font-black text-zinc-400 text-xs px-4 uppercase tracking-widest">طلبات واردة (ناس عايزة تشتري مني)</h3>
                    {orders.filter(o => o.sellerId === user.uid).length === 0 && <p className="text-center text-zinc-300 text-xs font-bold py-4">مفيش طلبات جديدة</p>}
                    {orders.filter(o => o.sellerId === user.uid).reverse().map(order => (
                        <div key={order.id} className="bg-zinc-900 text-white p-6 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400 blur-[50px] opacity-20"></div>
                            <div className="flex justify-between items-center relative z-10">
                                <div>
                                    <h4 className="font-black text-yellow-400 text-lg">{order.productName}</h4>
                                    <span className="text-[10px] text-zinc-400 font-bold block mt-1">المشتري: {order.buyerName}</span>
                                </div>
                                <span className={`text-[10px] px-3 py-1 rounded-full font-black ${order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {order.status === 'delivered' ? 'تم البيع ✅' : 'جاري التنفيذ'}
                                </span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] text-zinc-400 mb-1">عنوان التوصيل:</p>
                                <p className="text-sm font-bold text-white">{order.buyerLocation}</p>
                            </div>
                            
                            {order.status === 'pending' ? (
                                <div className="flex gap-2">
                                    <input type="number" placeholder="اكتب مصاريف الشحن..." className="flex-1 bg-zinc-800 p-4 rounded-2xl text-xs outline-none font-bold text-white placeholder-zinc-500" onChange={(e) => setDeliveryFees({...deliveryFees, [order.id]: e.target.value})} />
                                    <button onClick={() => update(ref(db, `orders/${order.id}`), { deliveryFee: deliveryFees[order.id], status: 'delivering' })} className="bg-yellow-400 text-black px-6 rounded-2xl font-black text-[10px] hover:bg-white transition-colors">إرسال السعر</button>
                                </div>
                            ) : order.status === 'delivering' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => {update(ref(db, `products/${order.productId}`), { status: 'sold' }); update(ref(db, `orders/${order.id}`), { status: 'delivered' }); showToast("🤝 مبروك! تم تسجيل المنتج كمباع");}} className="col-span-2 bg-green-500 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform">✅ تأكيد البيع (تم التسليم)</button>
                                    <button onClick={() => setMessageModal({ show: true, receiverId: order.buyerId, receiverName: order.buyerName })} className="bg-zinc-800 text-white py-3 rounded-2xl font-black text-[10px]">💬 كلم المشتري</button>
                                </div>
                            ) : <div className="w-full bg-black/30 py-3 rounded-2xl font-black text-[10px] text-center text-zinc-500">تمت أرشفة هذا الطلب</div>}
                        </div>
                    ))}
                </div>

                {/* قسم المشتري */}
                <div className="space-y-4">
                    <h3 className="font-black text-zinc-400 text-xs px-4 uppercase tracking-widest">مشترياتي</h3>
                    {orders.filter(o => o.buyerId === user.uid).reverse().map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-zinc-900 text-lg">{order.productName}</h4>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`w-2 h-2 rounded-full ${order.status === 'pending' ? 'bg-orange-500' : order.status === 'delivering' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                        <p className="text-xs font-bold text-zinc-500">
                                            {order.status === 'pending' ? 'بانتظار تحديد سعر الشحن...' : order.status === 'delivering' ? `الشحن: ${order.deliveryFee} ج.م (في الطريق)` : 'تم الاستلام ✅'}
                                        </p>
                                    </div>
                                </div>
                                {order.status === 'delivered' && (
                                    <button onClick={() => remove(ref(db, `orders/${order.id}`))} className="bg-red-50 text-red-500 w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md font-bold">✕</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'support' && (
            <div className="max-w-md mx-auto text-center space-y-6 pt-10">
                <div className="w-20 h-20 bg-zinc-100 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner">🎧</div>
                <h2 className="text-2xl font-black text-zinc-900">مشكلة فنية؟</h2>
                <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border border-zinc-100">
                    <textarea className="w-full bg-transparent p-6 min-h-[200px] outline-none font-bold text-zinc-700 text-sm resize-none" placeholder="اكتب تفاصيل المشكلة هنا..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
                    <button onClick={() => { if(!supportMsg) return; push(ref(db, 'messages/Admin'), { fromName: user.displayName, fromId: user.uid, text: supportMsg, date: new Date().toISOString() }); setSupportMsg(''); showToast("✅ تم استلام رسالتك"); }} className="w-full bg-zinc-900 text-white py-5 rounded-[2rem] font-black hover:bg-yellow-400 hover:text-black transition-colors">إرسال البلاغ</button>
                </div>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto pt-10">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center relative overflow-hidden mb-10">
                    <div className="absolute top-0 left-0 w-full h-32 bg-zinc-900"></div>
                    <img src={user.photoURL} className="w-32 h-32 rounded-[2rem] mx-auto border-8 border-white shadow-2xl relative z-10 object-cover" />
                    <h2 className="text-3xl font-black mt-6 text-zinc-900">{user.displayName}</h2>
                    <p className="text-zinc-400 text-sm font-bold mt-1">{user.email}</p>
                    <button onClick={() => signOut(auth).then(() => window.location.reload())} className="mt-8 bg-red-50 text-red-500 px-10 py-3 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all">تسجيل خروج</button>
                </div>
            </div>
        )}
      </main>

      {/* مودال العنوان (بديل Prompt) */}
      {addressModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md p-8 rounded-[3rem] shadow-2xl animate-slideUp">
                <h2 className="text-2xl font-black text-center mb-2">عنوان التوصيل 🚚</h2>
                <p className="text-center text-zinc-400 text-xs font-bold mb-8">عشان المندوب يقدر يوصلك، محتاجين العنوان بالتفصيل</p>
                <div className="bg-zinc-50 p-2 rounded-3xl border border-zinc-200 mb-4">
                    <input autoFocus className="w-full bg-transparent p-4 outline-none font-bold text-zinc-900 text-center" placeholder="المنطقة - اسم الشارع - رقم العمارة" value={addressModal.location} onChange={(e) => setAddressModal({...addressModal, location: e.target.value})} />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => {
                        if(!addressModal.location.trim()) return showToast("⚠️ اكتب العنوان الأول");
                        push(ref(db, 'orders'), { productId: addressModal.product.id, productName: addressModal.product.name, buyerId: user.uid, buyerName: user.displayName, sellerId: addressModal.product.sellerId, sellerName: addressModal.product.sellerName, buyerLocation: addressModal.location, status: 'pending', deliveryFee: 0, date: new Date().toISOString() });
                        setAddressModal({ show: false, product: null, location: '' }); showToast("✅ تم الطلب بنجاح"); setActiveTab('cart');
                    }} className="flex-1 bg-yellow-400 text-black py-4 rounded-2xl font-black shadow-lg shadow-yellow-400/20">تأكيد الطلب</button>
                    <button onClick={() => setAddressModal({ show: false, product: null, location: '' })} className="px-8 bg-zinc-100 text-zinc-400 rounded-2xl font-black">إلغاء</button>
                </div>
            </div>
        </div>
      )}

      {/* مودال النشر (التصميم الفخم اللي طلبه المستخدم) */}
      {showModal && (
        <div className="fixed inset-0 bg-zinc-900/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg p-8 rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-slideUp relative">
            <button onClick={() => setShowModal(false)} className="absolute top-8 left-8 w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 font-black hover:bg-red-50 hover:text-red-500 transition-colors">✕</button>
            <h2 className="text-2xl font-black text-center mb-8 mt-2">بيع جهازك 🚀</h2>
            
            <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                setUploading(true);
                push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, status: 'available', date: new Date().toISOString() })
                .then(() => { setUploading(false); setShowModal(false); showToast("✅ تم النشر في الورشة"); });
            }}>
              <div className="border-4 border-dashed border-zinc-200 rounded-[2.5rem] p-8 text-center cursor-pointer hover:bg-zinc-50 hover:border-yellow-400 transition-all relative group">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => {const r = new FileReader(); r.onloadend = () => setNewProduct({...newProduct, image: r.result}); r.readAsDataURL(e.target.files[0]);}} />
                 {newProduct.image ? <img src={newProduct.image} className="h-48 mx-auto rounded-2xl shadow-lg object-contain" /> : (
                    <div className="py-4">
                        <span className="text-4xl mb-2 block grayscale group-hover:grayscale-0 transition-all">📸</span>
                        <p className="text-xs text-zinc-400 font-bold group-hover:text-yellow-500">اضغط هنا لرفع صورة المنتج</p>
                    </div>
                 )}
              </div>

              <div className="space-y-3">
                  <input placeholder="اسم الجهاز (مثال: تكييف شارب 1.5 حصان)" className="w-full bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-yellow-400 transition-all" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  <select className="w-full bg-zinc-100 p-5 rounded-[1.5rem] font-bold text-zinc-500 outline-none appearance-none" onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                  <div className="flex gap-3">
                    <input type="number" placeholder="السعر (جنية)" className="flex-1 bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold text-zinc-900" onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                    <select className="bg-zinc-100 p-5 rounded-[1.5rem] font-bold text-zinc-500 outline-none" onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                        <option value="new">✨ جديد</option>
                        <option value="used">🛠️ مستعمل</option>
                    </select>
                  </div>
                  <input type="tel" placeholder="رقم الموبايل للتواصل" className="w-full bg-zinc-100 p-5 rounded-[1.5rem] outline-none font-bold text-zinc-900" onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
              </div>

              <button type="submit" disabled={uploading} className="w-full bg-zinc-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-yellow-400 hover:text-black transition-all transform active:scale-95">{uploading ? 'جاري الرفع...' : 'نشر الإعلان الآن ✅'}</button>
            </form>
          </div>
        </div>
      )}

      {/* زر النشر العائم */}
      {activeTab === 'home' && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-zinc-900 text-yellow-400 rounded-[2rem] shadow-2xl text-3xl font-black z-40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white">+</button>
      )}

      {/* مودال الشات */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/80 z-[150] flex flex-col md:justify-center md:items-center">
            <div className="bg-white w-full md:max-w-md h-full md:h-[80vh] md:rounded-[3rem] flex flex-col overflow-hidden shadow-2xl animate-slideUp">
                <div className="p-6 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center font-black">{messageModal.receiverName?.[0] || '?'}</div>
                       <h3 className="font-black text-zinc-900">{messageModal.receiverName}</h3>
                   </div>
                   <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-sm transition-colors">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                   {myMessages.filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId).sort((a,b) => (new Date(a.date || Date.now())) - (new Date(b.date || Date.now()))).map((msg, i) => (
                     <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-bold ${msg.fromId === user.uid ? 'bg-zinc-900 text-white rounded-br-none' : 'bg-zinc-100 text-zinc-800 rounded-bl-none'}`}>
                           {msg.text}
                           <span className="text-[9px] block mt-1 opacity-50 text-left" dir="ltr">{formatTime(msg.date)}</span>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="p-4 bg-white border-t border-zinc-100">
                   <div className="flex gap-2 bg-zinc-50 p-2 rounded-[2rem] border border-zinc-100">
                       <input className="flex-1 bg-transparent px-4 outline-none font-bold text-sm text-zinc-900" placeholder="اكتب رسالة..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
                       <button onClick={() => { if(!msgText.trim()) return; const d = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() }; push(ref(db, `messages/${messageModal.receiverId}`), d); push(ref(db, `messages/${user.uid}`), { ...d, toId: messageModal.receiverId }); setMsgText(''); }} className="bg-yellow-400 text-black w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">➤</button>
                   </div>
                </div>
            </div>
        </div>
      )}

      {viewImage && <div className="fixed inset-0 bg-black/95 z-[999] flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out" onClick={() => setViewImage(null)}><img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" /></div>}
    </div>
  );
}
