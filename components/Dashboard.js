import { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig'; // تأكدنا من استدعاء auth
import { ref, onValue, push } from "firebase/database";
import { signOut } from "firebase/auth"; // استيراد وظيفة تسجيل الخروج
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' });
  const [uploading, setUploading] = useState(false);

  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');

  // جلب البيانات
  useEffect(() => {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) {
        loaded.push({ id: key, ...data[key] });
      }
      setProducts(loaded.reverse()); 
    });

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

  // وظيفة تسجيل الخروج
  const handleLogout = () => {
    if(confirm("هل تريد تسجيل الخروج من حسابك؟")) {
      signOut(auth).then(() => {
        window.location.reload(); 
      });
    }
  };

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
    if (!newProduct.name || !newProduct.price || !newProduct.image || !newProduct.phone) {
      return alert("⚠️ يرجى إكمال كافة البيانات (الاسم، السعر، الهاتف، والصورة)");
    }

    setUploading(true);
    const productData = {
      name: newProduct.name,
      price: newProduct.price,
      condition: newProduct.condition,
      description: newProduct.desc,
      phone: newProduct.phone,
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
    alert("تم إرسال رسالتك للإدارة، سنرد عليك قريباً.");
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
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo" dir="rtl">
      
      {/* Header المطور */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-24 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Logo />
          </div>
          
          <div className="flex items-center gap-3">
             {/* زر الدعم الفني المنفصل */}
             <button 
                onClick={() => setActiveTab('support')} 
                className={`p-2 rounded-xl transition-all ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'hover:bg-zinc-800 text-gray-400'}`}
                title="الدعم الفني"
             >
                <span className="text-xl">🎧</span>
             </button>

             {/* زر الرسائل */}
             <button onClick={() => setActiveTab('inbox')} className={`relative p-2 rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'hover:bg-zinc-800 text-gray-400'}`}>
                <span className="text-xl">📩</span>
                {myMessages.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-black">{myMessages.length}</span>}
             </button>

             {/* أيقونة البروفايل */}
             <button onClick={() => setActiveTab('profile')} className="group transition-transform active:scale-90">
               <img src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className={`w-9 h-9 rounded-full border-2 object-cover ${activeTab === 'profile' ? 'border-yellow-400 scale-105' : 'border-zinc-700'}`} />
             </button>
          </div>
        </div>
        
        {/* شريط البحث */}
        <div className="container mx-auto px-4 pb-3">
          <div className="relative">
            <input className="w-full p-2 pr-10 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:border-yellow-400 outline-none text-sm" placeholder="ابحث في فولت..." onChange={(e) => setSearchTerm(e.target.value)} />
            <span className="absolute top-2 right-3 opacity-50">🔍</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[115px] z-40">
        <div className="flex justify-start md:justify-center p-2 gap-2 overflow-x-auto container mx-auto no-scrollbar">
          <TabButton label="الرئيسية" icon="🏠" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="جديد" icon="✨" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
          <TabButton label="مستعمل" icon="🛠️" active={activeTab === 'used'} onClick={() => setActiveTab('used')} />
        </div>
      </div>

      <main className="container mx-auto p-4">
        
        {/* الصفحة الشخصية مع تسجيل الخروج */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="h-24 bg-zinc-950"></div>
              <div className="px-6 pb-6 -mt-12 text-center">
                <img src={user.photoURL} className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md bg-white mb-3" />
                <h2 className="text-2xl font-black text-zinc-900">{user.displayName}</h2>
                <p className="text-zinc-400 text-sm mb-4">{user.email}</p>
                
                <div className="flex justify-center gap-3 mb-6">
                   <div className="bg-zinc-100 px-4 py-2 rounded-xl font-bold text-zinc-700 text-sm">📦 {filtered.length} إعلان</div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full py-3 rounded-2xl bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  تسجيل الخروج من الحساب 🚪
                </button>
              </div>
            </div>
            <h3 className="text-xl font-black mb-4 pr-3 border-r-4 border-yellow-400">منشوراتي</h3>
          </div>
        )}

        {/* الدعم الفني الاحترافي */}
        {activeTab === 'support' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mt-6 animate-fadeIn">
            <div className="text-center mb-6">
               <span className="text-5xl">🎧</span>
               <h2 className="text-2xl font-black mt-2">الدعم الفني</h2>
               <p className="text-zinc-400 text-sm">اكتب لنا مشكلتك وسيقوم فريق فولت بالرد عليك</p>
            </div>
            <textarea className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl mb-4 focus:ring-2 focus:ring-yellow-400 outline-none min-h-[150px] resize-none" placeholder="كيف يمكننا مساعدتك؟" value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
            <button onClick={sendSupport} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform">إرسال الرسالة</button>
          </div>
        )}

        {/* صندوق الرسائل المطور (Inbox) */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">الرسائل <span className="text-sm bg-yellow-400 text-black px-2 py-0.5 rounded-full">{myMessages.length}</span></h2>
            {myMessages.length === 0 && <div className="text-center py-20 text-zinc-300 font-bold">صندوق الرسائل فارغ حالياً</div>}
            {myMessages.map(msg => (
              <div key={msg.id} className={`p-5 rounded-3xl border transition-all ${msg.fromName === 'Admin' ? 'bg-zinc-950 text-white border-yellow-400' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.fromName === 'Admin' ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-500'}`}>
                      {msg.fromName === 'Admin' ? '⚡' : msg.fromName[0]}
                    </div>
                    <span className="font-bold text-sm">{msg.fromName === 'Admin' ? 'إدارة فولت' : msg.fromName}</span>
                  </div>
                  <span className="text-[10px] opacity-50">{new Date(msg.date).toLocaleString('ar-EG')}</span>
                </div>
                <p className="text-sm leading-relaxed opacity-90">{msg.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Grid المنتجات */}
        {(activeTab === 'home' || activeTab === 'new' || activeTab === 'used' || activeTab === 'profile') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="h-60 bg-zinc-100 relative overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-xl text-[10px] font-black shadow-sm ${item.condition === 'new' ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'}`}>{item.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-zinc-900 line-clamp-1">{item.name}</h3>
                    <p className="text-zinc-950 font-black text-lg">{item.price} ج.م</p>
                  </div>
                  <p className="text-zinc-400 text-xs line-clamp-2 h-8 mb-4">{item.description}</p>
                  
                  {user.uid !== item.sellerId ? (
                    <div className="flex gap-2">
                      <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 text-zinc-900 py-3 rounded-2xl text-xs font-black hover:bg-zinc-200 transition text-center">📞 اتصال</a>
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-1 bg-zinc-950 text-white py-3 rounded-2xl text-xs font-black hover:shadow-lg transition">💬 شات</button>
                    </div>
                  ) : (
                    <div className="text-center py-2 bg-zinc-50 rounded-xl text-[10px] text-zinc-400 font-bold">منشور بواسطتك</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* زر الإضافة العائم */}
      {!['support', 'inbox'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-yellow-400 text-black rounded-full shadow-2xl flex items-center justify-center text-3xl font-black hover:scale-110 active:scale-95 z-50 transition-all border-4 border-white">+</button>
      )}

      {/* المودالات (إضافة منتج + شات) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative animate-slideUp overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowModal(false)} className="absolute top-5 left-5 text-2xl text-zinc-400">&times;</button>
            <h2 className="text-2xl font-black mb-6 pr-3 border-r-4 border-yellow-400">إعلان جديد</h2>
            <form onSubmit={handlePublish} className="space-y-4">
              <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 text-center hover:bg-zinc-50 cursor-pointer relative transition group">
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newProduct.image ? <img src={newProduct.image} className="h-32 mx-auto rounded-xl object-contain" /> : <div><span className="text-4xl block mb-2 opacity-30">📸</span><span className="text-xs font-bold text-zinc-400">اضغط لإضافة صورة المنتج</span></div>}
              </div>
              <input type="text" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition" placeholder="ماذا تبيع؟" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <input type="tel" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition" placeholder="رقم الهاتف للتواصل" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition" placeholder="السعر" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <select className="p-4 bg-zinc-50 rounded-2xl border-none outline-none" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}><option value="new">جديد</option><option value="used">مستعمل</option></select>
              </div>
              <textarea className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none min-h-[100px] resize-none" placeholder="اكتب تفاصيل المنتج..." value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
              <button type="submit" disabled={uploading} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform">{uploading ? "جاري النشر..." : "نشر الآن 🚀"}</button>
            </form>
          </div>
        </div>
      )}

      {messageModal.show && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 relative animate-slideUp">
            <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="absolute top-5 left-5 text-2xl text-zinc-400">&times;</button>
            <h3 className="font-black mb-6 text-xl">مراسلة <span className="text-yellow-500">{messageModal.receiverName}</span></h3>
            <textarea className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none h-32 mb-6 focus:ring-2 focus:ring-yellow-400 transition resize-none" placeholder="اكتب استفسارك هنا..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
            <button onClick={sendMsgToSeller} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform">إرسال الرسالة ✅</button>
          </div>
        </div>
      )}

    </div>
  );
}

const TabButton = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2 rounded-2xl transition-all duration-300 font-black text-sm ${active ? 'bg-zinc-950 text-yellow-400 shadow-xl scale-105' : 'text-zinc-400 hover:bg-zinc-100'}`}>
    <span>{icon}</span><span>{label}</span>
  </button>
);
