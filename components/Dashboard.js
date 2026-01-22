import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update, set } from "firebase/database";
import { signOut } from "firebase/auth";

// --- 1. كارت المنتج ---
const ProductCard = ({ item, onViewImage, onChat, onAddToCart, isOwner, onDelete }) => {
  if (!item) return null;
  const isSold = item.status === 'sold';

  return (
    <div className={`bg-white rounded-[2rem] border border-zinc-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative ${isSold ? 'opacity-60 grayscale' : ''}`}>
      <div className="h-64 overflow-hidden relative bg-zinc-50">
        <img 
          src={item.image || 'https://via.placeholder.com/300'} 
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-700" 
          onClick={() => onViewImage(item.image)} 
          alt={item.name || 'Product'}
        />
        <div className="absolute top-4 right-4 bg-yellow-400 text-black px-4 py-1 rounded-full font-black text-[10px] shadow-lg z-10">
          {item.category || 'عام'}
        </div>
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 backdrop-blur-[2px]">
             <div className="bg-red-500 text-white px-8 py-3 rounded-xl font-black text-sm rotate-[-10deg] border-4 border-white tracking-widest">تم البيع 🚫</div>
          </div>
        )}
        {isOwner && (
            <button onClick={() => onDelete(item.id)} className="absolute top-4 left-4 bg-white/90 text-red-600 w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold z-10">🗑️</button>
        )}
      </div>
      <div className="p-6 text-right">
        <h3 className="font-black text-zinc-900 text-base mb-1 line-clamp-1">{item.name || 'بدون اسم'}</h3>
        <p className="text-[10px] text-zinc-400 font-bold mb-4">الحالة: {item.condition === 'new' ? 'جديد ✨' : 'مستعمل 🛠️'}</p>
        <div className="flex items-center justify-between mb-4 bg-zinc-50 p-3 rounded-2xl">
            <span className="font-black text-yellow-600 text-xl">{item.price || '0'} ج.م</span>
            <span className="text-[10px] text-zinc-400">نهائي</span>
        </div>
        <div className="flex gap-2">
          {!isSold ? (
             <>
               <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-[10px] font-black text-center shadow-md no-underline">📞 اتصال</a>
               {!isOwner && (
                 <>
                   <button onClick={() => onChat(item)} className="flex-1 bg-yellow-400 text-black py-3 rounded-xl font-black text-[10px] shadow-md">💬 دردشة</button>
                   <button onClick={() => onAddToCart(item)} className="flex-1 bg-white border border-zinc-200 text-black py-3 rounded-xl font-black text-[10px]">🛒 شراء</button>
                 </>
               )}
             </>
          ) : <button disabled className="w-full bg-zinc-200 text-zinc-400 py-3 rounded-xl font-black text-xs">غير متاح</button>}
        </div>
      </div>
    </div>
  );
};

// --- 2. المكون الرئيسي ---
export default function Dashboard({ user }) {
  // إيميل الأدمن (للعرض فقط هنا، الصلاحيات الحقيقية في صفحة الأدمن)
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com"; 

  const [activeTab, setActiveTab] = useState('home'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [isBanned, setIsBanned] = useState(false);

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

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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
    if(!user || !user.uid) return;

    // 1. مراقبة الحظر
    try {
        onValue(ref(db, `users/${user.uid}/banned`), (snap) => setIsBanned(snap.val() === true));
    } catch(e) {}

    // 2. جلب الطلبات
    try {
        onValue(ref(db, 'orders'), (snap) => {
            const data = snap.val();
            setOrders(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
        });
    } catch(e) {}

    // 3. جلب الرسائل (الخاصة بالمستخدم فقط)
    // الأدمن عنده لوحة تحكم خاصة بيشوف منها، هنا بنعرض لليوزر رسايله هو بس
    onValue(ref(db, `messages/${user.uid}`), (snap) => {
        const data = snap.val();
        setMyMessages(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
    });

    // 4. جلب المنتجات
    try {
        onValue(ref(db, 'products'), (snap) => {
            const data = snap.val();
            setProducts(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse() : []);
        });
    } catch(e) {}

  }, [user]);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const filtered = products.filter(p => {
    if (!p) return false;
    const s = searchTerm.toLowerCase();
    return (p.name?.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s)) && (p.name || p.category);
  });

  // تجميع المحادثات (لليوزر العادي)
  const uniqueConversations = myMessages.length > 0 
    ? [...new Map(myMessages.filter(m => m).map(m => {
        // الطرف الآخر هو دايما "مش أنا"
        const otherId = m.fromId === user.uid ? m.toId : m.fromId;
        // لو الطرف الآخر هو "Support" أو "Admin"، نخليه Admin
        const displayId = (otherId === 'Support' || otherId === 'Admin') ? 'Admin' : otherId;
        return [displayId, m]; 
      })).values()]
    : [];

  const safeTime = (d) => {
      try { return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } 
      catch { return ""; }
  };

  // إرسال رسالة من داخل الشات
  const handleSendMessage = () => {
      if(!msgText.trim()) return;
      
      const msgData = { 
          fromName: user.displayName, 
          fromId: user.uid, 
          text: msgText, 
          date: new Date().toISOString() 
      };

      // لو بكلم الدعم
      if (messageModal.receiverId === 'Admin' || messageModal.receiverId === 'Support') {
          // 1. نسخة في تذاكر الدعم (عشان الأدمن يشوفها في القايمة)
          push(ref(db, `support_tickets/${user.uid}`), msgData);
          // 2. نسخة في رسايلي (عشان تظهر في الشات لما الأدمن يفتحه)
          push(ref(db, `messages/${user.uid}`), { ...msgData, toId: 'Admin' });
      } else {
          // رسالة عادية ليوزر تاني
          push(ref(db, `messages/${messageModal.receiverId}`), msgData);
          push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
      }
      setMsgText('');
  };

  // إرسال تذكرة دعم جديدة (من التبويب الخاص)
  const sendSupportTicket = () => {
      if(!supportMsg) return;
      
      const msg = { 
          fromName: user.displayName, 
          fromId: user.uid, 
          text: supportMsg, 
          date: new Date().toISOString()
      };

      // ⚠️ التعديل المهم هنا لربطها بصفحة الأدمن ⚠️
      
      // 1. ابعتها لـ support_tickets عشان تظهر في قايمة "الدعم" عند الأدمن
      push(ref(db, `support_tickets/${user.uid}`), msg);
      
      // 2. ابعتها لـ messages/user.uid عشان تظهر في الهيستوري لما الأدمن يفتح الشات
      push(ref(db, `messages/${user.uid}`), { ...msg, toId: 'Admin' });

      setSupportMsg('');
      showToast("✅ تم إرسال رسالتك للدعم");
  };

  if (isBanned) return <div className="h-screen bg-black text-red-500 flex flex-col items-center justify-center font-black text-2xl text-center p-4">🚫 تم حظر حسابك<br/><span className="text-white text-sm mt-4 font-normal">تواصل مع الإدارة: {ADMIN_EMAIL}</span></div>;
  if (!user) return <div className="h-screen flex items-center justify-center font-bold">يرجى تسجيل الدخول...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24 font-cairo select-none" dir="rtl">
      {toast.show && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-xl">{toast.msg}</div>}

      <header className="bg-white shadow-sm sticky top-0 z-50 p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
             <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-yellow-400 font-black">W</div>
             <span className="font-black text-zinc-900 italic text-xl">الورشة</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setActiveTab('cart')} className={`p-3 rounded-xl ${activeTab === 'cart' ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-500'}`}>🛒</button>
             <button onClick={() => setActiveTab('support')} className={`p-3 rounded-xl ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-500'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`p-3 rounded-xl relative ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-500'}`}>
                📩 {uniqueConversations.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-3 h-3 rounded-full"></span>}
             </button>
             <img src={user.photoURL || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-xl border border-zinc-200" onClick={() => setActiveTab('profile')} alt="p" />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {activeTab === 'home' && (
          <>
            {isAdmin && <div className="bg-blue-100 text-blue-800 p-3 text-center rounded-2xl mb-6 font-bold text-xs shadow-sm">
                👋 أهلاً يا مدير! 
                <br/>
                <a href="/admin" className="underline mt-1 block">اضغط هنا للذهاب للوحة التحكم</a>
            </div>}
            <div className="mb-6">
                <input className="w-full bg-white p-4 rounded-2xl text-center font-bold shadow-sm outline-none" placeholder="بحث..." onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6">
                <button onClick={() => {}} className="flex-shrink-0 w-20 h-24 bg-yellow-400 rounded-2xl flex flex-col items-center justify-center border-2 border-yellow-400 shadow-md"><span className="text-2xl">🌍</span><span className="text-[10px] font-black mt-1">الكل</span></button>
                {categories.map(cat => (
                    <div key={cat.id} className="flex-shrink-0 w-20 h-24 rounded-2xl relative overflow-hidden border-2 border-white shadow-sm">
                        <img src={cat.img} className="w-full h-full object-cover" alt={cat.name} />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white text-[10px] font-black text-center px-1">{cat.name}</span></div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map(item => (
                    <ProductCard key={item.id} item={item} onViewImage={setViewImage} onChat={(it) => setMessageModal({ show: true, receiverId: it.sellerId, receiverName: it.sellerName })} onAddToCart={(p) => setAddressModal({ show: true, product: p, location: '' })} isOwner={item.sellerId === user.uid} onDelete={(id) => confirm("حذف؟") && remove(ref(db, `products/${id}`))} />
                ))}
            </div>
          </>
        )}

        {activeTab === 'inbox' && (
            <div className="space-y-4">
                <h2 className="text-2xl font-black mb-4 px-2">الرسائل</h2>
                {uniqueConversations.length === 0 && <p className="text-center text-zinc-400 py-10">مفيش رسايل</p>}
                {uniqueConversations.map((chat, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-zinc-100 cursor-pointer" onClick={() => setMessageModal({ show: true, receiverId: chat.fromId === user.uid ? chat.toId : chat.fromId, receiverName: chat.fromName })}>
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-lg">{chat.fromName?.[0]}</div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm">{chat.fromName} {(chat.fromId === 'Support' || chat.fromName.includes('الدعم')) && <span className="text-[9px] bg-red-100 text-red-600 px-2 rounded-full mr-1">دعم</span>}</h4>
                            <p className="text-xs text-zinc-400 truncate">{chat.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'cart' && (
            <div className="space-y-8">
                <h2 className="text-2xl font-black px-2">الطلبات</h2>
                <div className="space-y-4">
                    <h3 className="font-bold text-zinc-400 text-xs px-2">طلبات واردة</h3>
                    {orders.filter(o => o.sellerId === user.uid).reverse().map(order => (
                        <div key={order.id} className="bg-zinc-900 text-white p-5 rounded-3xl shadow-xl space-y-4">
                            <div className="flex justify-between">
                                <span className="font-bold text-yellow-400">{order.productName}</span>
                                <span className="text-[10px] bg-white/10 px-2 py-1 rounded">{order.status === 'delivered' ? 'مباع ✅' : 'جاري'}</span>
                            </div>
                            <p className="text-xs text-zinc-300">العنوان: {order.buyerLocation}</p>
                            {order.status === 'pending' ? (
                                <div className="flex gap-2">
                                    <input type="number" placeholder="سعر الشحن..." className="flex-1 bg-zinc-800 p-3 rounded-xl text-xs text-white" onChange={(e) => setDeliveryFees({...deliveryFees, [order.id]: e.target.value})} />
                                    <button onClick={() => update(ref(db, `orders/${order.id}`), { deliveryFee: deliveryFees[order.id], status: 'delivering' })} className="bg-yellow-400 text-black px-4 rounded-xl font-bold text-xs">إرسال</button>
                                </div>
                            ) : order.status === 'delivering' ? (
                                <button onClick={() => {update(ref(db, `products/${order.productId}`), { status: 'sold' }); update(ref(db, `orders/${order.id}`), { status: 'delivered' }); showToast("مبروك البيعة!");}} className="w-full bg-green-500 py-3 rounded-xl font-bold text-xs">تأكيد البيع والاستلام ✅</button>
                            ) : <div className="text-center text-xs text-green-400 font-bold">تمت العملية بنجاح</div>}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'support' && (
            <div className="text-center pt-10 px-4">
                <h2 className="text-2xl font-black mb-4">الدعم الفني 🎧</h2>
                <p className="text-zinc-400 text-xs mb-4">واجهت مشكلة؟ ابعتلنا وهنرد عليك فوراً</p>
                <textarea className="w-full bg-white p-4 rounded-2xl border shadow-sm h-40 outline-none" placeholder="اكتب مشكلتك..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
                <button onClick={sendSupportTicket} className="w-full bg-black text-white py-4 rounded-2xl font-bold mt-4 hover:bg-yellow-400 hover:text-black transition-colors">إرسال تذكرة</button>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="text-center pt-10">
                <div className="bg-white p-8 rounded-3xl shadow-sm inline-block w-full max-w-sm">
                    <img src={user.photoURL} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-yellow-400" />
                    <h2 className="text-xl font-black">{user.displayName}</h2>
                    <p className="text-xs text-zinc-400 mt-2">{user.email}</p>
                    <button onClick={() => signOut(auth)} className="mt-6 bg-red-50 text-red-500 px-8 py-3 rounded-xl font-bold text-xs">تسجيل خروج</button>
                </div>
            </div>
        )}
      </main>

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 left-4 text-zinc-400 font-bold">✕</button>
            <h2 className="text-xl font-black text-center mb-6">إضافة إعلان</h2>
            <div className="space-y-4">
                <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-6 text-center relative">
                    <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => {const r = new FileReader(); r.onloadend = () => setNewProduct({...newProduct, image: r.result}); r.readAsDataURL(e.target.files[0]);}} />
                    {newProduct.image ? <img src={newProduct.image} className="h-32 mx-auto" /> : <span className="text-zinc-400 font-bold">اضغط لرفع صورة</span>}
                </div>
                <input className="w-full bg-zinc-100 p-3 rounded-xl font-bold text-sm" placeholder="اسم المنتج" onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                <div className="flex gap-2">
                    <input className="w-full bg-zinc-100 p-3 rounded-xl font-bold text-sm" type="number" placeholder="السعر" onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                    <select className="bg-zinc-100 p-3 rounded-xl font-bold text-sm" onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <input className="w-full bg-zinc-100 p-3 rounded-xl font-bold text-sm" type="tel" placeholder="رقم الموبايل" onChange={(e) => setNewProduct({...newProduct, phone: e.target.value})} />
                <button onClick={() => { setUploading(true); push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, status: 'available', date: new Date().toISOString() }).then(() => { setUploading(false); setShowModal(false); showToast("تم النشر"); }); }} disabled={uploading} className="w-full bg-yellow-400 py-3 rounded-xl font-bold">نشر</button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {addressModal.show && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md p-6 rounded-3xl">
                <h2 className="text-xl font-black text-center mb-4">عنوان التوصيل</h2>
                <input autoFocus className="w-full bg-zinc-100 p-4 rounded-xl font-bold mb-4" placeholder="العنوان بالتفصيل..." value={addressModal.location} onChange={(e) => setAddressModal({...addressModal, location: e.target.value})} />
                <button onClick={() => { if(!addressModal.location) return; push(ref(db, 'orders'), { productId: addressModal.product.id, productName: addressModal.product.name, buyerId: user.uid, buyerName: user.displayName, sellerId: addressModal.product.sellerId, sellerName: addressModal.product.sellerName, buyerLocation: addressModal.location, status: 'pending', deliveryFee: 0, date: new Date().toISOString() }); setAddressModal({ show: false, product: null, location: '' }); showToast("تم الطلب"); setActiveTab('cart'); }} className="w-full bg-black text-white py-3 rounded-xl font-bold">تأكيد</button>
                <button onClick={() => setAddressModal({ show: false, product: null, location: '' })} className="w-full mt-2 text-zinc-400 font-bold text-sm">إلغاء</button>
            </div>
        </div>
      )}

      {/* Chat Modal */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-md h-[80vh] rounded-3xl flex flex-col overflow-hidden relative">
                <div className={`p-4 border-b flex justify-between items-center ${messageModal.receiverId === 'Admin' ? 'bg-red-50' : 'bg-zinc-50'}`}>
                    <div className="flex flex-col">
                        <span className={`font-black ${messageModal.receiverId === 'Admin' ? 'text-red-600' : 'text-zinc-900'}`}>{messageModal.receiverName}</span>
                    </div>
                    <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })}>✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {/* عرض الرسايل (مع الدعم أو مع يوزر عادي) */}
                    {myMessages.filter(m => {
                        if (messageModal.receiverId === 'Admin' || messageModal.receiverId === 'Support') {
                            // لو فاتح شات مع الأدمن، اعرض رسايل الأدمن
                            return m.fromId === 'Admin' || m.fromId === 'Support' || m.toId === 'Admin';
                        }
                        // لو شات عادي
                        return (m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId) && m.fromId !== 'Support' && m.toId !== 'Admin';
                    }).sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0)).map((msg, i) => (
                        <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-xl max-w-[80%] text-sm font-bold ${msg.fromId === user.uid ? 'bg-black text-white' : 'bg-zinc-100'}`}>
                                {msg.text}
                                <span className="block text-[8px] opacity-50 text-left mt-1" dir="ltr">{safeTime(msg.date)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t flex gap-2">
                    <input className="flex-1 bg-zinc-100 p-3 rounded-xl font-bold text-sm" placeholder="اكتب..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
                    <button onClick={handleSendMessage} className="bg-yellow-400 px-4 rounded-xl font-bold">➤</button>
                </div>
            </div>
        </div>
      )}

      {viewImage && <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center" onClick={() => setViewImage(null)}><img src={viewImage} className="max-w-full max-h-full rounded-xl" /></div>}
    </div>
  );
}
