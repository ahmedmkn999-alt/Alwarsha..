import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, push } from "firebase/database";
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home'); // home, new, used, profile, support
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');

  // جلب المنتجات من قاعدة البيانات
  useEffect(() => {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) {
        loaded.push({ id: key, ...data[key] });
      }
      setProducts(loaded);
    });
  }, []);

  // دالة لإضافة منتج تجريبي (سيتم استبدالها بصفحة إضافة لاحقاً)
  const addProductDummy = () => {
    const newProduct = {
      name: "موتور غسالة 2 حصان",
      price: "2500",
      condition: "new",
      sellerId: user.uid,
      sellerName: user.displayName || "مستخدم فولت",
      phone: user.email, // أو رقم الهاتف لو متاح
      description: "موتور جديد بالكرتونة لم يستخدم، ضمان سنة.",
      image: "https://via.placeholder.com/300/000000/FFD700?text=VOLT+Part", // صورة تجريبية
      date: new Date().toISOString()
    };
    push(ref(db, 'products'), newProduct);
    alert("⚡ تم نشر الإعلان بنجاح!");
  };

  // إرسال رسالة دعم فني
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

  // فلترة المنتجات حسب التبويب والبحث
  const filtered = products.filter(p => {
    const match = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if(activeTab === 'home') return match; // الرئيسية تعرض الكل
    if(activeTab === 'new') return match && p.condition === 'new';
    if(activeTab === 'used') return match && p.condition === 'used';
    if(activeTab === 'profile') return p.sellerId === user.uid;
    return match;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      
      {/* 1. الرأس (Header) - أسود وذهبي */}
      <header className="bg-dark text-white shadow-xl sticky top-0 z-50 border-b-4 border-primary">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          {/* اللوجو */}
          <div className="w-28 scale-90 origin-right">
            <Logo />
          </div>
          
          {/* معلومات المستخدم */}
          <div className="text-xs text-gray-400 flex flex-col items-end">
            <span>مرحباً،</span>
            <span className="font-bold text-primary truncate max-w-[150px]">{user.displayName || "عميل فولت"}</span>
          </div>
        </div>

        {/* شريط البحث */}
        <div className="container mx-auto px-4 pb-4">
          <div className="relative">
            <input 
              className="w-full p-3 pr-10 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder-gray-500 transition-all" 
              placeholder="ابحث عن قطعة غيار (مثال: موتور، مروحة)..." 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute top-3 right-3 text-gray-500">🔍</span>
          </div>
        </div>
      </header>

      {/* 2. شريط التنقل (Tabs) */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[130px] z-40">
        <div className="flex justify-between md:justify-center p-2 gap-1 overflow-x-auto container mx-auto no-scrollbar">
          <TabButton label="الرئيسية" icon="🏠" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="جديد" icon="✨" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
          <TabButton label="مستعمل" icon="🛠️" active={activeTab === 'used'} onClick={() => setActiveTab('used')} />
          <TabButton label="صفحتي" icon="👤" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <TabButton label="الدعم" icon="🎧" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
        </div>
      </div>

      {/* 3. المحتوى الرئيسي */}
      <main className="container mx-auto p-4 animate-fadeIn">
        
        {/* قسم الدعم الفني */}
        {activeTab === 'support' ? (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
            <h2 className="text-2xl font-bold mb-2 text-dark">خدمة عملاء فولت ⚡</h2>
            <p className="text-gray-500 mb-6">واجهت مشكلة؟ نحن هنا للمساعدة.</p>
            <textarea 
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary outline-none min-h-[150px]" 
              placeholder="اكتب رسالتك هنا..."
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
            />
            <button onClick={sendSupport} className="w-full bg-dark text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition">إرسال التذكرة</button>
          </div>
        ) : (
          /* شبكة المنتجات */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.length > 0 ? (
              filtered.map(item => (
                <ProductCard key={item.id} item={item} />
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <p className="text-gray-400 text-lg">لا توجد منتجات مطابقة للبحث 😕</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* 4. الزر العائم للإضافة (Floating Action Button) */}
      {activeTab !== 'support' && (
        <button 
          onClick={addProductDummy}
          className="fixed bottom-6 left-6 w-16 h-16 bg-primary text-dark rounded-full shadow-2xl flex items-center justify-center text-4xl font-bold hover:scale-110 hover:rotate-90 transition-all duration-300 z-50 border-4 border-white"
        >
          +
        </button>
      )}
    </div>
  );
}

// --- مكونات فرعية للتنظيم ---

// زر التبويب
const TabButton = ({ label, icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold ${
      active 
      ? 'bg-dark text-primary shadow-md transform scale-105' 
      : 'bg-transparent text-gray-500 hover:bg-gray-100'
    }`}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

// كارت المنتج
const ProductCard = ({ item }) => (
  <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
    {/* صورة المنتج */}
    <div className="relative h-48 bg-gray-200 overflow-hidden">
      <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
      {/* بادج الحالة */}
      <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
        item.condition === 'new' 
        ? 'bg-green-500 text-white' 
        : 'bg-primary text-dark'
      }`}>
        {item.condition === 'new' ? '✨ جديد' : '🛠️ مستعمل'}
      </span>
    </div>
    
    {/* تفاصيل المنتج */}
    <div className="p-5">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{item.name}</h3>
        <p className="text-primary font-black text-xl whitespace-nowrap">{item.price} ج.م</p>
      </div>
      
      <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{item.description}</p>
      
      {/* أزرار الإجراءات */}
      <div className="flex gap-3 mt-2">
        <button className="flex-1 bg-dark text-white py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-800 transition flex justify-center items-center gap-2">
           📞 اتصال
        </button>
        <button className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-lg font-bold text-sm hover:border-dark hover:text-dark transition">
           💬 دردشة
        </button>
      </div>
    </div>
  </div>
);
    
