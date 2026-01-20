import { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove } from "firebase/database";
import { signOut } from "firebase/auth";
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

  // جلب البيانات من قاعدة البيانات
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

  // وظيفة حذف المنشور
  const handleDeleteProduct = (productId) => {
    if(confirm("🗑️ هل أنت متأكد من حذف هذا الإعلان نهائياً؟")) {
      const productRef = ref(db, `products/${productId}`);
      remove(productRef)
        .then(() => alert("تم حذف الإعلان بنجاح ✅"))
        .catch(() => alert("عذراً، حدث خطأ أثناء الحذف"));
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
      return alert("⚠️ يرجى إكمال كافة البيانات");
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
    alert("تم الإرسال بنجاح ✅");
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
    alert("تم إرسال رسالتك للإدارة.");
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
      
      {/* Header */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-24 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Logo />
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2 rounded-xl transition-all ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'hover:bg-zinc-800 text-gray-400'}`}>
                <span className="text-xl">🎧</span>
             </button>
             <button onClick={() => setActiveTab('inbox')} className={`relative p-2 rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'hover:bg-zinc-800 text-gray-400'}`}>
                <span className="text-xl">📩</span>
                {myMessages.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-black">{myMessages.length}</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className="group transition-transform active:scale-90">
               <img src={user.photoURL} className={`w-9 h-9 rounded-full border-2 object-cover ${activeTab === 'profile' ? 'border-yellow-400 scale-105' : 'border-zinc-700'}`} />
             </button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-3">
          <div className="relative">
            <input className="w-full p-2 pr-10 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:border-yellow-400 outline-none text-sm font-bold" placeholder="ابحث في فولت..." onChange={(e) => setSearchTerm(e.target.value)} />
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
        
        {/* Profile Section */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="h-28 bg-zinc-950"></div>
              <div className="px-8 pb-8 -mt-14 text-center">
                <img src={user.photoURL} className="w-28 h-28 rounded-full mx-auto border-4 border-white shadow-md bg-white mb-4 object-cover" />
                <h2 className="text-2xl font-black text-zinc-900">{user.displayName}</h2>
                <div className="bg-zinc-100 inline-block px-4 py-1.5 rounded-xl font-bold text-zinc-600 text-sm mt-2 mb-6">📦 {filtered.length} إعلان</div>
                <button onClick={handleLogout} className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2">تسجيل الخروج 🚪</button>
              </div>
            </div>
            <h3 className="text-xl font-black mb-6 pr-3 border-r-4 border-yellow-400">منشوراتي</h3>
          </div>
        )}

        {/* Support Section */}
        {activeTab === 'support' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 mt-6 animate-fadeIn">
            <div className="text-center mb-8">
               <span className="text-6xl">🎧</span>
               <h2 className="text-2xl font-black mt-4">الدعم الفني</h2>
               <p className="text-zinc-400 text-sm mt-1">فريق فولت في خدمتك دائماً</p>
            </div>
            <textarea className="w-full p-5 bg-zinc-50 border border-zinc-100 rounded-[1.5rem] mb-4 focus:ring-2 focus:ring-yellow-400 outline-none min-h-[160px] resize-none font-bold" placeholder="اكتب مشكلتك بالتفصيل..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} />
            <button onClick={sendSupport} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-zinc-800 transition-all">إرسال للدعم ✅</button>
          </div>
        )}

        {/* Inbox Section (With Reply Feature) */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">الرسائل الواردة <span className="text-sm bg-yellow-400 text-black px-2 py-0.5 rounded-full">{myMessages.length}</span></h2>
            {myMessages.length === 0 && <div className="text-center py-20 text-zinc-300 font-bold bg-white rounded-[2rem] border border-dashed border-zinc-200">صندوق الوارد فارغ</div>}
            {myMessages.map(msg => (
              <div key={msg.id} className={`p-5 rounded-[2rem] border transition-all ${msg.fromName === 'Admin' ? 'bg-zinc-950 text-white border-yellow-400 shadow-yellow-400/10 shadow-lg' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {msg.fromName === 'Admin' ? '⚡ إدارة فولت' : msg.fromName}
                  </div>
                  <span className="text-[10px] opacity-50">{new Date(msg.date).toLocaleString('ar-EG')}</span>
                </div>
                <p className="text-sm leading-relaxed opacity-90 mb-4 bg-zinc-50 p-3 rounded-xl text-zinc-700 font-bold">{msg.text}</p>
                {msg.fromName !== 'Admin' && (
                  <button onClick={() => setMessageModal({ show: true, receiverId: msg.fromId, receiverName: msg.fromName })} className="w-full py-2 bg-zinc-950 text-white text-xs font-black rounded-xl hover:bg-yellow-400 hover:text-black transition-all flex items-center justify-center gap-2">
                    ↩️ الرد على {msg.fromName}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Products Grid Section */}
        {(activeTab === 'home' || activeTab === 'new' || activeTab === 'used' || activeTab === 'profile') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="h-64 bg-zinc-100 relative overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <span className={`absolute top-4 right-4 px-4 py-1.5 rounded-2xl text-[10px] font-black shadow-lg ${item.condition === 'new' ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'}`}>{item.condition === 'new' ? '✨ جديد' : '🛠️ مستعمل'}</span>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-zinc-900 text-lg line-clamp-1 group-hover:text-yellow-600 transition-colors">{item.name}</h3>
                    <div className="bg-zinc-950 text-yellow-400 px-3 py-1 rounded-xl font-black text-sm">{item.price} ج.م</div>
                  </div>
                  <p className="text-zinc-400 text-xs line-clamp-2 h-10 mb-6 leading-relaxed font-bold">{item.description}</p>
                  
                  {user.uid !== item.sellerId ? (
                    <div className="flex gap-3 mt-2">
                      <a href={`tel:${item.phone}`} className="flex-[1.2] flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 py-4 rounded-2xl text-xs font-black hover:bg-zinc-200 transition-all shadow-sm active:scale-95">
                         📞 اتصال سريع
                      </a>
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-1 flex items-center justify-center gap-2 bg-zinc-950 text-white py-4 rounded-2xl text-xs font-black hover:bg-yellow-400 hover:text-black transition-all shadow-xl active:scale-95">
                         💬 دردشة
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      {activeTab === 'profile' ? (
                        <button onClick={() => handleDeleteProduct(item.id)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-black hover:bg-red-600 hover:text-white transition-all flex justify-center items-center gap-2 shadow-sm">
                          🗑️ حذف الإعلان نهائياً
                        </button>
                      ) : (
                        <div className="w-full py-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-center font-bold text-zinc-400 text-[10px]">
                          منشور بواسطتك 👑
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center py-20 text-zinc-400 font-bold">لا توجد نتائج مطابقة</div>}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      {!['support', 'inbox'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-yellow-400 text-black rounded-full shadow-2xl flex items-center justify-center text-3xl font-black hover:scale-110 active:scale-95 z-50 transition-all border-4 border-white">+</button>
      )}

      {/* Modal: Add Product */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 relative animate-slideUp overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-2xl text-zinc-400 hover:text-black">&times;</button>
            <h2 className="text-2xl font-black mb-8 pr-3 border-r-4 border-yellow-400">إعلان جديد</h2>
            <form onSubmit={handlePublish} className="space-y-4">
              <div className="border-2 border-dashed border-zinc-200 rounded-[1.5rem] p-6 text-center relative transition group overflow-hidden hover:bg-zinc-50">
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newProduct.image ? <img src={newProduct.image} className="h-40 mx-auto rounded-xl object-contain shadow-sm" /> : <div><span className="text-5xl block mb-2 opacity-30">📸</span><span className="text-xs font-bold text-zinc-400">اضغط لإضافة صورة (مطلوبة)</span></div>}
              </div>
              <input type="text" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition font-bold" placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <input type="tel" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition font-bold" placeholder="رقم الموبايل للتواصل" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition font-bold" placeholder="السعر" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <select className="p-4 bg-zinc-50 rounded-2xl border-none outline-none font-black" value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}><option value="new">جديد</option><option value="used">مستعمل</option></select>
              </div>
              <textarea className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none min-h-[100px] resize-none font-bold" placeholder="اكتب تفاصيل المنتج..." value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
              <button type="submit" disabled={uploading} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-zinc-800 transition-all">{uploading ? "جاري النشر..." : "نشر الآن 🚀"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chat & Reply */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 relative animate-slideUp">
            <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="absolute top-6 left-6 text-2xl text-zinc-400 hover:text-black">&times;</button>
            <h3 className="font-black mb-6 text-xl">مراسلة <span className="text-yellow-500">{messageModal.receiverName}</span></h3>
            <textarea className="w-full p-5 bg-zinc-50 rounded-2xl border-none outline-none h-36 mb-6 focus:ring-2 focus:ring-yellow-400 transition resize-none font-bold shadow-inner" placeholder="اكتب رسالتك..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
            <button onClick={sendMsgToSeller} className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-zinc-800 transition-all active:scale-95">إرسال الرسالة ✅</button>
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
