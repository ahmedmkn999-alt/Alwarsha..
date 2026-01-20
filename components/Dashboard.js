import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, push } from "firebase/database";
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  
  // حالات فورم الإضافة الجديد
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', desc: '', condition: 'new' });

  // إيميل الدعم الفني (هيظهر في أعلى الموقع)
  const SUPPORT_EMAIL = "support@volt.com"; // تقدر تغيره لإيميلك

  // جلب المنتجات من قاعدة البيانات
  useEffect(() => {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) {
        loaded.push({ id: key, ...data[key] });
      }
      // نعكس الترتيب عشان الأحدث يظهر الأول
      setProducts(loaded.reverse()); 
    });
  }, []);

  // دالة النشر الحقيقية
  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return alert("اكتب اسم المنتج والسعر على الأقل");

    const productData = {
      name: newProduct.name,
      price: newProduct.price,
      condition: newProduct.condition,
      description: newProduct.desc,
      sellerId: user.uid,
      sellerName: user.displayName || "مستخدم فولت",
      phone: user.email, 
      image: "https://via.placeholder.com/300/000000/FFD700?text=VOLT", // صورة افتراضية مؤقتاً
      date: new Date().toISOString()
    };

    push(ref(db, 'products'), productData);
    setShowModal(false); // إغلاق النافذة
    setNewProduct({ name: '', price: '', desc: '', condition: 'new' }); // تصفير الخانات
    alert("⚡ تم نشر الإعلان بنجاح!");
  };

  // دالة إرسال الدعم الفني
  const sendSupport = () => {
    if(!supportMsg) return;
    push(ref(db, 'support'), {
      user: user.uid,
      email: user.email,
      msg: supportMsg,
      date: new Date().toISOString()
    });
    setSupportMsg('');
    alert("تم استلام رسالتك، سنرد عليك قريباً.");
  };

  // فلترة المنتجات
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
      
      {/* 1. الرأس (Header) */}
      <header className="bg-dark text-white shadow-xl sticky top-0 z-50 border-b-4 border-primary">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          
          {/* يمين: اللوجو */}
          <div className="w-24 scale-90 origin-right"><Logo /></div>
          
          {/* يسار: زر التواصل السريع (الإيميل) */}
          <a 
            href={`mailto:${SUPPORT_EMAIL}`} 
            className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-lg hover:bg-zinc-700 transition border border-zinc-600"
          >
            <span className="text-xl">📧</span>
            <div className="hidden md:block text-xs text-gray-300">
              <span className="block font-bold text-primary">تواصل معنا</span>
              <span>{SUPPORT_EMAIL}</span>
            </div>
          </a>

        </div>

        {/* شريط البحث */}
        <div className="container mx-auto px-4 pb-4 mt-2">
          <div className="relative">
            <input 
              className="w-full p-3 pr-10 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-primary outline-none placeholder-gray-500" 
              placeholder="ابحث عن قطعة غيار..." 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute top-3 right-3 text-gray-500">🔍</span>
          </div>
        </div>
      </header>

      {/* 2. التبويبات */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[135px] z-40">
        <div className="flex justify-between md:justify-center p-2 gap-1 overflow-x-auto container mx-auto no-scrollbar">
          <TabButton label="الرئيسية" icon="🏠" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="جديد" icon="✨" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
          <TabButton label="مستعمل" icon="🛠️" active={activeTab === 'used'} onClick={() => setActiveTab('used')} />
          <TabButton label="صفحتي" icon="👤" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <TabButton label="الدعم" icon="🎧" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
        </div>
      </div>

      {/* 3. المحتوى */}
      <main className="container mx-auto p-4 animate-fadeIn">
        {activeTab === 'support' ? (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
            <h2 className="text-2xl font-bold mb-2 text-dark">خدمة عملاء فولت ⚡</h2>
            <p className="text-gray-500 mb-4">واجهت مشكلة؟ ارسل لنا وسنحلها فوراً.</p>
            <textarea 
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary outline-none min-h-[150px]" 
              placeholder="اكتب رسالتك هنا..."
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
            />
            <button onClick={sendSupport} className="w-full bg-dark text-white py-3 rounded-xl font-bold hover:bg-black transition">إرسال التذكرة</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => <ProductCard key={item.id} item={item} />)}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-20">
                <p className="text-gray-400 text-lg">لا توجد منتجات مطابقة للبحث 😕</p>
                <button onClick={() => setShowModal(true)} className="mt-4 text-primary font-bold hover:underline">أضف أول منتج!</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. زر الإضافة العائم */}
      {activeTab !== 'support' && (
        <button 
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 left-6 w-16 h-16 bg-primary text-dark rounded-full shadow-2xl flex items-center justify-center text-4xl font-bold hover:scale-110 hover:rotate-90 transition-all duration-300 z-50 border-4 border-white"
        >
          +
        </button>
      )}

      {/* 5. نافذة إضافة منتج جديد (Modal) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-fadeIn">
            <button onClick={() => setShowModal(false)} className="absolute top-4 left-4 text-2xl text-gray-500 hover:text-red-500 transition">&times;</button>
            <h2 className="text-2xl font-bold mb-6 text-dark border-r-4 border-primary pr-3">إضافة إعلان جديد</h2>
            
            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المنتج</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none"
                  placeholder="مثال: موتور غسالة زانوسي"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">السعر (ج.م)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none"
                    placeholder="1500"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">الحالة</label>
                  <select 
                    className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none"
                    value={newProduct.condition}
                    onChange={e => setNewProduct({...newProduct, condition: e.target.value})}
                  >
                    <option value="new">✨ جديد</option>
                    <option value="used">🛠️ مستعمل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">وصف المنتج</label>
                <textarea 
                  className="w-full p-3 bg-gray-50 rounded-lg border focus:border-primary outline-none h-24"
                  placeholder="اكتب تفاصيل عن حالة المنتج..."
                  value={newProduct.desc}
                  onChange={e => setNewProduct({...newProduct, desc: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full bg-dark text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition shadow-lg">
                نشر الإعلان الآن 🚀
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// المكونات الفرعية
const TabButton = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold ${active ? 'bg-dark text-primary shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>
    <span>{icon}</span><span>{label}</span>
  </button>
);

const ProductCard = ({ item }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
    <div className="h-48 bg-gray-200 relative overflow-hidden">
      <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
      <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold shadow-sm ${item.condition === 'new' ? 'bg-green-500 text-white' : 'bg-primary text-dark'}`}>
        {item.condition === 'new' ? 'جديد' : 'مستعمل'}
      </span>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-dark line-clamp-1">{item.name}</h3>
        <p className="text-primary font-black text-lg whitespace-nowrap">{item.price} ج.م</p>
      </div>
      <p className="text-gray-500 text-xs mt-1 line-clamp-2 h-8">{item.description}</p>
      <div className="flex gap-2 mt-4">
         <button className="flex-1 bg-dark text-white py-2 rounded-lg text-sm font-bold hover:bg-zinc-800 transition">📞 اتصال</button>
         <button className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-bold hover:border-dark hover:text-dark transition">💬 شات</button>
      </div>
    </div>
  </div>
);
