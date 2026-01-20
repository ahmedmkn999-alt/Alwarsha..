import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, push } from "firebase/database";
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]); // صندوق الرسائل
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  
  // حالات فورم الإضافة والنشر
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null });
  const [uploading, setUploading] = useState(false);

  // حالات إرسال رسالة لبائع
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');

  const SUPPORT_EMAIL = "support@volt.com"; 

  // 1. جلب المنتجات + جلب رسائلي الخاصة
  useEffect(() => {
    // جلب المنتجات
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) {
        loaded.push({ id: key, ...data[key] });
      }
      setProducts(loaded.reverse()); 
    });

    // جلب الرسائل الخاصة بي (Inbox)
    const messagesRef = ref(db, `messages/${user.uid}`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const loadedMsgs = [];
      for (const key in data) {
        loadedMsgs.push({ id: key, ...data[key] });
      }
      setMyMessages(loadedMsgs.reverse());
    });
  }, [user.uid]);

  // 2. معالجة الصورة وتحويلها لنص (Base64)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) return alert("حجم الصورة كبير جداً! اختر صورة أقل من 1 ميجا.");
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. نشر المنتج (بالصورة الإجبارية)
  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return alert("اكتب اسم المنتج والسعر");
    if (!newProduct.image) return alert("⚠️ لازم ترفع صورة للمنتج عشان المصداقية");

    setUploading(true);
    const productData = {
      name: newProduct.name,
      price: newProduct.price,
      condition: newProduct.condition,
      description: newProduct.desc,
      sellerId: user.uid,
      sellerName: user.displayName || "مستخدم فولت",
      phone: user.email, // أو رقم الهاتف لو متاح
      image: newProduct.image,
      date: new Date().toISOString()
    };

    push(ref(db, 'products'), productData);
    setUploading(false);
    setShowModal(false);
    setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null });
    alert("⚡ تم نشر الإعلان بنجاح!");
  };

  // 4. إرسال رسالة لبائع (شات داخلي)
  const sendMsgToSeller = () => {
    if(!msgText) return;
    push(ref(db, `messages/${messageModal.receiverId}`), {
      fromName: user.displayName || "مستخدم",
      text: msgText,
      type: 'chat', // نوع الرسالة شات
      date: new Date().toISOString()
    });
    setMessageModal({ show: false, receiverId: '', receiverName: '' });
    setMsgText('');
    alert("تم إرسال رسالتك للبائع ✅");
  };

  // 5. إرسال تذكرة دعم فني
  const sendSupport = () => {
    if(!supportMsg) return;
    push(ref(db, 'support'), {
      userId: user.uid, // مهم عشان الأدمن يرد عليك
      userName: user.displayName || "مستخدم",
      msg: supportMsg,
      date: new Date().toISOString()
    });
    setSupportMsg('');
    alert("تم استلام رسالتك، سنرد عليك في صندوق الرسائل.");
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
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-24 scale-90 origin-right"><Logo /></div>
          <div className="flex items-center gap-3">
             {/* أيقونة الرسائل في الهيدر */}
             <button onClick={() => setActiveTab('inbox')} className="relative p-2">
                <span className="text-2xl">📩</span>
                {myMessages.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{myMessages.length}</span>}
             </button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-4 mt-2">
          <div className="relative">
            <input className="w-full p-3 pr-10 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-primary outline-none" placeholder="ابحث عن قطعة غيار..." onChange={(e) => setSearchTerm(e.target.value)} />
            <span className="absolute top-3 right-3 text-gray-500">🔍</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[135px] z-40">
        <div className="flex justify-between md:justify-center p-2 gap-1 overflow-x-auto container mx-auto no-scrollbar">
          <TabButton label="الرئيسية" icon="🏠" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="جديد" icon="✨" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
          <TabButton label="مستعمل" icon="🛠️" active={activeTab === 'used'} onClick={() => setActiveTab('used')} />
          <TabButton label="رسائلي" icon="📩" active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} />
          <TabButton label="الدعم" icon="🎧" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto p-4 animate-fadeIn">
        
        {/* صفحة الدعم الفني */}
        {activeTab === 'support' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
            <h2 className="text-2xl font-bold mb-2 text-dark">خدمة عملاء فولت ⚡</h2>
            <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary outline-none min-h-[150px]" placeholder="اكتب شكوتك هنا وسيتم الرد في تبويب الرسائل..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
            <button onClick={sendSupport} className="w-full bg-dark text-white py-3 rounded-xl font-bold">إرسال</button>
          </div>
        )}

        {/* صفحة الرسائل (Inbox) */}
        {activeTab === 'inbox' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">صندوق الرسائل ({myMessages.length})</h2>
            {myMessages.length === 0 && <p className="text-gray-400 text-center">لا توجد رسائل بعد</p>}
            {myMessages.map(msg => (
              <div key={msg.id} className={`p-4 rounded-xl border ${msg.fromName === 'Admin' ? 'bg-zinc-900 text-white border-primary' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between mb-2">
                  <span className={`font-bold ${msg.fromName === 'Admin' ? 'text-primary' : 'text-dark'}`}>{msg.fromName === 'Admin' ? '⚡ إدارة فولت' : msg.fromName}</span>
                  <span className="text-xs opacity-70">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                </div>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* عرض المنتجات */}
        {(activeTab === 'home' || activeTab === 'new' || activeTab === 'used' || activeTab === 'profile') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${item.condition === 'new' ? 'bg-green-500 text-white' : 'bg-primary text-dark'}`}>{item.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-dark line-clamp-1">{item.name}</h3>
                    <p className="text-primary font-black text-lg">{item.price} ج.م</p>
                  </div>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.description}</p>
                  
                  {/* أزرار التواصل */}
                  <div className="flex gap-2 mt-4">
                    {/* زر الاتصال */}
                    <a href={`tel:${item.phone || ''}`} className="flex-1 bg-zinc-100 text-dark py-2 rounded-lg text-sm font-bold hover:bg-zinc-200 transition text-center flex justify-center items-center gap-2">
                      📞 اتصال
                    </a>
                    {/* زر الشات */}
                    {user.uid !== item.sellerId && (
                      <button 
                        onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })}
                        className="flex-1 bg-dark text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition flex justify-center items-center gap-2"
                      >
                        💬 شات
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* زر الإضافة العائم */}
      {activeTab !== 'support' && activeTab !== 'inbox' && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-6 w-16 h-16 bg-primary text-dark rounded-full shadow-2xl flex items-center justify-center text-4xl font-bold hover:scale-110 z-50 border-4 border-white">+</button>
      )}

      {/* Modal إضافة منتج */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-fadeIn overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowModal(false)} className="absolute top-4 left-4 text-2xl text-gray-500">&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-dark border-r-4 border-primary pr-3">إضافة إعلان</h2>
            <form onSubmit={handlePublish} className="space-y-4">
              
              {/* رفع الصورة */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative">
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newProduct.image ? (
                  <img src={newProduct.image} className="h-32 mx-auto rounded object-contain" />
                ) : (
                  <div className="text-gray-500">
                    <span className="text-2xl block">📷</span>
                    <span className="text-sm font-bold">اضغط لإضافة صورة (إجباري)</span>
                  </div>
                )}
              </div>

              <input type="text" className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" placeholder="السعر" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <select className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                  <option value="new">✨ جديد</option>
                  <option value="used">🛠️ مستعمل</option>
                </select>
              </div>
              <textarea className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none h-20" placeholder="الوصف..." value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
              <button type="submit" disabled={uploading} className="w-full bg-dark text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition">
                {uploading ? "جاري الرفع..." : "نشر الإعلان 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal إرسال رسالة (شات) */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="absolute top-4 left-4 text-2xl text-gray-500">&times;</button>
            <h3 className="font-bold mb-4">رسالة إلى: {messageModal.receiverName}</h3>
            <textarea className="w-full p-3 bg-gray-100 rounded-lg border focus:border-primary outline-none h-32 mb-4" placeholder="اكتب استفسارك..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
            <button onClick={sendMsgToSeller} className="w-full bg-primary text-black py-3 rounded-lg font-bold">إرسال الرسالة</button>
          </div>
        </div>
      )}

    </div>
  );
}

// مكون الزر
const TabButton = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold ${active ? 'bg-dark text-primary shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>
    <span>{icon}</span><span>{label}</span>
  </button>
);
    
