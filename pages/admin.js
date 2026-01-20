import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, push } from "firebase/database";
import { useRouter } from 'next/router';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState({}); // لتخزين الرد لكل رسالة

  const router = useRouter();
  const ADMIN_EMAIL = "ahmedmkn999@gmail.com"; // 👈 تأكد من الايميل هنا

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setUser(currentUser);
        fetchData();
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = () => {
    // جلب المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(list);
    });

    // جلب رسائل الدعم
    onValue(ref(db, 'support'), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setMessages(list);
    });
  };

  // حذف
  const deleteItem = async (path, id) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await remove(ref(db, `${path}/${id}`));
    }
  };

  // 🔴 الرد على المستخدم
  const handleReply = (msgId, userId, userName) => {
    const text = replyText[msgId];
    if (!text) return alert("اكتب الرد أولاً");

    // إرسال الرد إلى صندوق رسائل المستخدم
    push(ref(db, `messages/${userId}`), {
      fromName: 'Admin', // عشان يظهر عنده باسم الأدمن
      text: `رد على شكوتك: ${text}`,
      date: new Date().toISOString()
    });

    // تفريغ خانة الرد وحذف الشكوى (اختياري)
    setReplyText({ ...replyText, [msgId]: '' });
    alert(`تم إرسال الرد إلى ${userName} بنجاح ✅`);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-primary">تحقق...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6" dir="rtl">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-700 pb-4">
        <h1 className="text-3xl font-bold text-primary">⚡ غرفة التحكم</h1>
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">عودة للموقع</button>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'products' ? 'bg-primary text-black' : 'bg-zinc-800'}`}>المنتجات ({products.length})</button>
        <button onClick={() => setActiveTab('messages')} className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'messages' ? 'bg-primary text-black' : 'bg-zinc-800'}`}>رسائل الدعم ({messages.length})</button>
      </div>

      <div className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
        
        {/* المنتجات */}
        {activeTab === 'products' && (
          <table className="w-full text-right">
            <thead className="bg-black text-primary">
              <tr>
                <th className="p-4">صورة</th>
                <th className="p-4">المنتج</th>
                <th className="p-4">السعر</th>
                <th className="p-4">البائع</th>
                <th className="p-4">حذف</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-t border-zinc-700 hover:bg-zinc-750">
                  <td className="p-4"><img src={p.image} className="w-12 h-12 rounded object-cover bg-black" /></td>
                  <td className="p-4">{p.name}</td>
                  <td className="p-4 text-primary font-bold">{p.price}</td>
                  <td className="p-4 text-sm text-gray-400">{p.sellerName}<br/>{p.phone}</td>
                  <td className="p-4"><button onClick={() => deleteItem('products', p.id)} className="text-red-500 hover:text-red-400">حذف 🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* الرسائل والرد عليها */}
        {activeTab === 'messages' && (
          <div className="p-4 space-y-4">
            {messages.length === 0 && <p className="text-center text-gray-500">مفيش رسايل</p>}
            {messages.map(msg => (
              <div key={msg.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-primary block">{msg.userName}</span>
                    <span className="text-xs text-gray-500">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <button onClick={() => deleteItem('support', msg.id)} className="text-red-500 text-sm">حذف</button>
                </div>
                
                <p className="text-gray-300 bg-black p-3 rounded mb-4">{msg.msg}</p>
                
                {/* قسم الرد */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded p-2 text-white"
                    placeholder="اكتب ردك هنا..."
                    value={replyText[msg.id] || ''}
                    onChange={(e) => setReplyText({...replyText, [msg.id]: e.target.value})}
                  />
                  <button 
                    onClick={() => handleReply(msg.id, msg.userId, msg.userName)}
                    className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-500"
                  >
                    إرسال الرد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
