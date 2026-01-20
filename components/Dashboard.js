import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, push } from "firebase/database";
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  
  // تحديث: أضفنا phone لحالة المنتج الجديد
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' });
  const [uploading, setUploading] = useState(false);

  // حالات الشات
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');

  // جلب البيانات
  useEffect(() => {
    // المنتجات
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) {
        loaded.push({ id: key, ...data[key] });
      }
      setProducts(loaded.reverse()); 
    });

    // الرسائل
    if (user?.uid) {
      const messagesRef = ref(db, `messages/${user.uid}`);
      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = [];
        for (const key in data) {
          loadedMsgs.push({ id: key, ...data[key] });
        }
        setMyMessages(loadedMsgs.reverse());
      });
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2000000) return alert("حجم الصورة كبير! اختر صورة أقل من 2 ميجا.");
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return alert("الاسم والسعر مطلوبين");
    if (!newProduct.image) return alert("⚠️ صورة المنتج ضرورية");
    if (!newProduct.phone) return alert("⚠️ لازم تكتب رقم للتواصل"); // التحقق من الرقم

    setUploading(true);
    const productData = {
      name: newProduct.name,
      price: newProduct.price,
      condition: newProduct.condition,
      description: newProduct.desc,
      phone: newProduct.phone, // حفظ الرقم اللي كتبه المستخدم
      sellerId: user.uid,
      sellerName: user.displayName || "مستخدم",
      sellerImage: user.photoURL || null,
      image: newProduct.image,
      date: new Date().toISOString()
    };

    push(ref(db, 'products'), productData);
    setUploading(false);
    setShowModal(false);
    setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' });
    alert("⚡ تم النشر بنجاح!");
  };

  // إرسال رسالة شات
  const sendMsgToSeller = () => {
    if(!msgText) return;
    push(ref(db, `messages/${messageModal.receiverId}`), {
      fromName: user.displayName || "مستخدم",
      fromId: user.uid,
      text: msgText,
      date: new Date().toISOString()
    });
    setMessageModal({ show: false, receiverId: '', receiverName: '' });
    setMsgText('');
    alert("تم الإرسال للبائع ✅");
  };

  const sendSupport = () => {
    if(!supportMsg) return;
    push(ref(db, 'support'), {
      userId: user.uid,
      userName: user.displayName || "مستخدم",
      msg: supportMsg,
      date: new Date().toISOString()
    });
    setSupportMsg('');
    alert("تم إرسال شكوتك للإدارة.");
  };

  const filtered = products.filter(p => {
    const match = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if(activeTab === 'home') return match;
    if(activeTab === 'new') return match && p.condition === 'new';
    if(activeTab === 'used') return match && p.condition === 'used';
    if(activeTab === 'profile') return p.sellerId === user.uid;
    return match;
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-24" dir="rtl">
      
      {/* Header */}
      <header className="bg-dark text-white shadow-xl sticky top-0 z-50 border-b-4 border-primary">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="w-24 scale-90 origin-right cursor-pointer" onClick={() => setActiveTab('home')}>
            <Logo />
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveTab('inbox')} className="relative p-2 hover:bg-zinc-800 rounded-full transition">
                <span className="text-2xl">📩</span>
                {myMessages.length > 0 && <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-dark">{myMessages.length}</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className="relative group">
               <img src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className={`w-10 h-10 rounded-full border-2 object-cover transition-all ${activeTab === 'profile' ? 'border-primary scale-110 shadow-[0_0_10px_#FFD700]' : 'border-zinc-500 hover:border-gray-300'}`} />
             </button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-3">
          <div className="relative">
            <input className="w-full p-2.5 pr-10 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-primary outline-none placeholder-gray-500 text-sm" placeholder="ابحث في فولت..." onChange={(e) => setSearchTerm(e.target.value)} />
            <span className="absolute top-2.5 right-3 text-gray-500">🔍</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[120px] z-40">
        <div className="flex justify-between md:justify-center p-2 gap-1 overflow-x-auto container mx-auto no-scrollbar">
          <TabButton label="الرئيسية" icon="🏠" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="جديد" icon="✨" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
          <TabButton label="مستعمل" icon="🛠️" active={activeTab === 'used'} onClick={() => setActiveTab('used')} />
          <TabButton label="الدعم" icon="🎧" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto p-4 animate-fadeIn">
        
        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-20 bg-zinc-900"></div>
              <div className="relative z-10">
                <img src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-white shadow-lg object-cover bg-white" />
                <h2 className="text-2xl font-bold text-dark">{user.displayName || "مستخدم فولت"}</h2>
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg text-dark font-bold mt-2">
                   <span>📦</span><span>{filtered.length} إعلان</span>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4 border-r-4 border-primary pr-3">منشوراتي</h3>
          </div>
        )}

        {/* Support */}
        {activeTab === 'support' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
            <h2 className="text-2xl font-bold mb-2 text-dark">خدمة العملاء</h2>
            <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary outline-none min-h-[150px]" placeholder="اكتب مشكلتك..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
            <button onClick={sendSupport} className="w-full bg-dark text-white py-3 rounded-xl font-bold">إرسال</button>
          </div>
        )}

        {/* Inbox */}
        {activeTab === 'inbox' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">الرسائل ({myMessages.length})</h2>
            {myMessages.length === 0 && <div className="text-center py-10 text-gray-400">صندوق الرسائل فارغ</div>}
            {myMessages.map(msg => (
              <div key={msg.id} className={`p-4 rounded-xl border relative ${msg.fromName === 'Admin' ? 'bg-zinc-900 text-white border-primary' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-bold">{msg.fromName === 'Admin' ? '⚡ إدارة فولت' : msg.fromName}</span>
                  <span className="text-xs opacity-70">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                </div>
                <p className="text-sm">{msg.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {(activeTab === 'home' || activeTab === 'new' || activeTab === 'used' || activeTab === 'profile') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all">
                <div className="h-56 bg-gray-100 relative overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <span className={`absolute top-2 right-2 px-3 py-1 rounded text-xs font-bold shadow-sm ${item.condition === 'new' ? 'bg-green-600 text-white' : 'bg-primary text-dark'}`}>{item.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                  {activeTab === 'profile' && <span className="absolute bottom-0 w-full bg-black/60 text-white text-center text-xs py-1">منتجك</span>}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-dark line-clamp-1 text-lg">{item.name}</h3>
                    <p className="text-primary font-black text-xl">{item.price} ج.م</p>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2 h-10">{item.description}</p>
                  
                  {/* أزرار التواصل (لا تظهر لنفسي) */}
                  {user.uid !== item.sellerId && (
                    <div className="flex gap-2 mt-4">
                      {/* زر الاتصال: يستخدم الرقم اللي المستخدم دخله */}
                      <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 text-dark py-2.5 rounded-lg text-sm font-bold hover:bg-zinc-200 transition text-center flex justify-center items-center gap-2 border border-gray-200">
                        📞 اتصال
                      </a>
                      {/* زر الشات: يفتح المودال */}
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-1 bg-dark text-white py-2.5 rounded-lg text-sm font-bold hover:bg-black transition flex justify-center items-center gap-2">
                        💬 شات
                      </button>
                    </div>
                  )}
                  
                  {activeTab === 'profile' && <div className="mt-4 text-center text-xs text-gray-400">تواصل مع الإدارة للحذف</div>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && activeTab === 'profile' && <div className="col-span-full text-center py-10 text-gray-400">لم تنشر شيئاً بعد</div>}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      {activeTab !== 'support' && activeTab !== 'inbox' && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-6 w-16 h-16 bg-primary text-dark rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.4)] flex items-center justify-center text-4xl font-bold hover:scale-110 z-50 border-4 border-white transition-transform">+</button>
      )}

      {/* Modal: Add Product */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-fadeIn overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowModal(false)} className="absolute top-4 left-4 text-2xl text-gray-500">&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-dark border-r-4 border-primary pr-3">إعلان جديد</h2>
            <form onSubmit={handlePublish} className="space-y-4">
              
              {/* صورة المنتج */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative transition">
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newProduct.image ? <img src={newProduct.image} className="h-32 mx-auto rounded object-contain shadow-sm" /> : <div><span className="text-4xl block mb-2">📸</span><span className="text-sm font-bold text-gray-600">صورة المنتج (مطلوبة)</span></div>}
              </div>

              <input type="text" className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" placeholder="اسم القطعة" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              
              {/* رقم الهاتف الجديد */}
              <div className="relative">
                <input 
                  type="tel" 
                  className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" 
                  placeholder="رقم للتواصل (مثال: 010xxxxxxx)" 
                  value={newProduct.phone} 
                  onChange={e => setNewProduct({...newProduct, phone: e.target.value})} 
                />
                <span className="absolute top-3 left-3 text-xl">📱</span>
              </div>

              <div className="flex gap-4">
                <input type="number" className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" placeholder="السعر" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <select className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}><option value="new">✨ جديد</option><option value="used">🛠️ مستعمل</option></select>
              </div>
              
              <textarea className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none h-20" placeholder="الوصف..." value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
              
              <button type="submit" disabled={uploading} className="w-full bg-dark text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition shadow-lg">{uploading ? "جاري الرفع..." : "نشر الإعلان 🚀"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chat */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative animate-fadeIn">
            <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="absolute top-4 left-4 text-2xl text-gray-500">&times;</button>
            <h3 className="font-bold mb-4 text-lg border-b pb-2">إرسال إلى: <span className="text-primary">{messageModal.receiverName}</span></h3>
            <textarea className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none h-32 mb-4" placeholder="اكتب رسالتك..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
            <button onClick={sendMsgToSeller} className="w-full bg-primary text-black py-3 rounded-lg font-bold hover:bg-yellow-400 transition">إرسال الآن</button>
          </div>
        </div>
      )}

    </div>
  );
}

// زر التبويب
const TabButton = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold ${active ? 'bg-dark text-primary shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>
    <span>{icon}</span><span>{label}</span>
  </button>
);
        
