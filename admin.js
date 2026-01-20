// pages/admin.js
import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove } from "firebase/database";
import { useRouter } from 'next/router';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // products, messages
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const router = useRouter();

  // 🔴 ضع ايميلك هنا لكي تكون أنت فقط الأدمن
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com"; // غير هذا بإيميلك الحقيقي

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setUser(currentUser);
        fetchData(); // جلب البيانات
      } else {
        router.push('/'); // طرد أي شخص ليس الأدمن
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // جلب البيانات من فايربيز
  const fetchData = () => {
    // 1. المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(list);
    });

    // 2. رسائل الدعم
    onValue(ref(db, 'support'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setMessages(list);
    });
  };

  // حذف عنصر (منتج أو رسالة)
  const deleteItem = async (path, id) => {
    if (confirm("هل أنت متأكد من الحذف نهائياً؟ ⚠️")) {
      await remove(ref(db, `${path}/${id}`));
      alert("تم الحذف بنجاح");
    }
  };

  if (loading) return <div className="h-screen bg-black text-primary flex items-center justify-center">جاري التحقق من الصلاحيات...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-zinc-700 pb-4">
        <h1 className="text-3xl font-bold text-primary">⚡ غرفة التحكم (Admin)</h1>
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">العودة للموقع ⬅</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700">
          <h3 className="text-gray-400">عدد المنتجات</h3>
          <p className="text-4xl font-bold text-white mt-2">{products.length}</p>
        </div>
        <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700">
          <h3 className="text-gray-400">رسائل الدعم</h3>
          <p className="text-4xl font-bold text-primary mt-2">{messages.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('products')} 
          className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'products' ? 'bg-primary text-black' : 'bg-zinc-800 text-gray-400'}`}
        >
          المنتجات
        </button>
        <button 
          onClick={() => setActiveTab('messages')} 
          className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'messages' ? 'bg-primary text-black' : 'bg-zinc-800 text-gray-400'}`}
        >
          رسائل الدعم الفني
        </button>
      </div>

      {/* Content */}
      <div className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
        
        {/* جدول المنتجات */}
        {activeTab === 'products' && (
          <table className="w-full text-right">
            <thead className="bg-black text-primary">
              <tr>
                <th className="p-4">المنتج</th>
                <th className="p-4">السعر</th>
                <th className="p-4">البائع</th>
                <th className="p-4">تحكم</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-t border-zinc-700 hover:bg-zinc-750">
                  <td className="p-4 flex items-center gap-3">
                    <img src={product.image} className="w-10 h-10 rounded object-cover bg-gray-500"/>
                    <span className="truncate max-w-[150px]">{product.name}</span>
                  </td>
                  <td className="p-4 font-bold text-primary">{product.price}</td>
                  <td className="p-4 text-sm text-gray-400">
                    {product.sellerName}<br/>
                    {product.phone}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => deleteItem('products', product.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      حذف 🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* جدول الرسائل */}
        {activeTab === 'messages' && (
          <div className="p-4 space-y-4">
            {messages.length === 0 && <p className="text-center text-gray-500">لا توجد رسائل جديدة</p>}
            {messages.map(msg => (
              <div key={msg.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-700 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-primary">{msg.email || msg.phone}</span>
                    <span className="text-xs text-gray-500">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <p className="text-gray-300 bg-black p-3 rounded">{msg.msg}</p>
                </div>
                <button 
                  onClick={() => deleteItem('support', msg.id)}
                  className="text-red-500 hover:text-red-400 mr-4"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
