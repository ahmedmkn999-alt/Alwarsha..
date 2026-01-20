import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, push } from "firebase/database";
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home');
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportMsg, setSupportMsg] = useState('');

  // جلب البيانات
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

  // إضافة منتج (للعرض فقط في الكود الحالي، يحتاج مودال)
  const addProductDummy = () => {
    const newProduct = {
      name: "موتور غسالة زانوسي",
      price: "1500",
      condition: "used",
      sellerId: user.uid,
      sellerPhone: user.phoneNumber,
      description: "موتور بحالة الزيرو خلع",
      image: "https://via.placeholder.com/300",
      isFeatured: true
    };
    push(ref(db, 'products'), newProduct);
    alert("تم إضافة إعلان تجريبي");
  };

  const sendSupport = () => {
    if(!supportMsg) return;
    push(ref(db, 'support'), {
      user: user.uid,
      phone: user.phoneNumber,
      msg: supportMsg,
      date: new Date().toISOString()
    });
    setSupportMsg('');
    alert("وصلتنا رسالتك!");
  };

  const filtered = products.filter(p => {
    const match = p.name?.includes(searchTerm);
    if(activeTab === 'home') return match && p.isFeatured;
    if(activeTab === 'new') return match && p.condition === 'new';
    if(activeTab === 'used') return match && p.condition === 'used';
    if(activeTab === 'profile') return p.sellerId === user.uid;
    return match;
  });

  return (
    <div className="min-h-screen pb-20 bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-dark text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="w-32"><Logo /></div>
          <div className="text-sm text-gray-300">أهلاً، {user.phoneNumber}</div>
        </div>
        <div className="mt-4 container mx-auto">
          <input 
            className="w-full p-3 rounded-lg text-black focus:ring-2 focus:ring-primary outline-none" 
            placeholder="🔍 بتبحث عن ايه النهاردة؟" 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white shadow-sm overflow-x-auto">
        <div className="flex p-2 gap-2 container mx-auto min-w-max">
          {['home', 'new', 'used', 'profile', 'support'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full font-bold transition ${
                activeTab === tab ? 'bg-primary text-dark' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab === 'home' ? 'الرئيسية' : 
               tab === 'new' ? 'جديد' : 
               tab === 'used' ? 'مستعمل' : 
               tab === 'profile' ? 'صفحتي' : 'الدعم الفني'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {activeTab === 'support' ? (
          <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-dark">تواصل مع إدارة الورشة</h2>
            <textarea 
              className="w-full p-3 border rounded h-32 mb-4" 
              placeholder="واجهت مشكلة؟ عندك اقتراح؟"
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
            />
            <button onClick={sendSupport} className="bg-dark text-white px-8 py-2 rounded hover:bg-slate-800">إرسال</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition border border-gray-100">
                <div className="relative">
                  <img src={item.image} className="w-full h-48 object-cover" alt={item.name} />
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${item.condition === 'new' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {item.condition === 'new' ? 'جديد' : 'مستعمل'}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-dark mb-1">{item.name}</h3>
                  <p className="text-primary font-bold text-xl mb-2">{item.price} ج.م</p>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{item.description}</p>
                  <div className="flex gap-2">
                    <a href={`tel:${item.sellerPhone}`} className="flex-1 bg-dark text-white py-2 rounded text-center font-bold">اتصال 📞</a>
                    <button className="flex-1 border border-dark text-dark py-2 rounded font-bold">رسالة 💬</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Button */}
      {activeTab !== 'support' && (
        <button 
          onClick={addProductDummy}
          className="fixed bottom-6 left-6 bg-primary text-dark p-4 rounded-full shadow-2xl z-50 font-bold hover:scale-110 transition"
        >
          + إضافة
        </button>
      )}
    </div>
  );
}
