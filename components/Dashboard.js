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

  // حالات الشات المطور والفويس
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  useEffect(() => {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) loaded.push({ id: key, ...data[key] });
      setProducts(loaded.reverse()); 
    });

    if (user?.uid) {
      const messagesRef = ref(db, `messages/${user.uid}`);
      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = [];
        for (const key in data) loadedMsgs.push({ id: key, ...data[key] });
        setMyMessages(loadedMsgs.reverse());
      });
    }
  }, [user]);

  // وظائف تسجيل الصوت
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => sendVoiceMsg(reader.result);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert("يرجى السماح بالوصول للميكروفون 🎤"); }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMsg = (voiceData) => {
    push(ref(db, `messages/${messageModal.receiverId}`), {
      fromName: user.displayName || "مستخدم",
      fromId: user.uid,
      voice: voiceData,
      date: new Date().toISOString()
    });
  };

  const handleLogout = () => {
    if(confirm("هل تريد تسجيل الخروج؟")) signOut(auth).then(() => window.location.reload());
  };

  const handleDeleteProduct = (productId) => {
    if(confirm("🗑️ حذف الإعلان نهائياً؟")) remove(ref(db, `products/${productId}`));
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.image || !newProduct.phone) return alert("أكمل البيانات");
    setUploading(true);
    push(ref(db, 'products'), {
      ...newProduct,
      sellerId: user.uid,
      sellerName: user.displayName,
      sellerImage: user.photoURL,
      date: new Date().toISOString()
    });
    setUploading(false);
    setShowModal(false);
    setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' });
  };

  const sendMsgToSeller = () => {
    if(!msgText.trim()) return;
    push(ref(db, `messages/${messageModal.receiverId}`), {
      fromName: user.displayName || "مستخدم",
      fromId: user.uid,
      text: msgText,
      date: new Date().toISOString()
    });
    setMsgText('');
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo" dir="rtl">
      
      {/* Header */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-24 cursor-pointer" onClick={() => setActiveTab('home')}><Logo /></div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('support')} className={`p-2 rounded-xl ${activeTab === 'support' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>🎧</button>
             <button onClick={() => setActiveTab('inbox')} className={`relative p-2 rounded-xl ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>
                📩 {myMessages.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{myMessages.length}</span>}
             </button>
             <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className="w-9 h-9 rounded-full border-2 border-zinc-700" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Inbox: قائمة المحادثات */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-3 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">المحادثات</h2>
            {[...new Map(myMessages.map(m => [m.fromId, m])).values()].map(chat => (
              <div key={chat.id} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId, receiverName: chat.fromName })} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-yellow-400 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-zinc-900 text-yellow-400 flex items-center justify-center font-black">{chat.fromName[0]}</div>
                <div className="flex-1">
                  <h4 className="font-black text-sm">{chat.fromName === 'Admin' ? '⚡ إدارة فولت' : chat.fromName}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-1">{chat.voice ? "🎤 رسالة صوتية" : chat.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* عرض المنتجات */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-50 overflow-hidden group">
                <img src={item.image} className="h-64 w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-lg">{item.name}</h3>
                    <div className="bg-zinc-950 text-yellow-400 px-3 py-1 rounded-xl font-black text-sm">{item.price} ج.م</div>
                  </div>
                  {user.uid !== item.sellerId ? (
                    <div className="flex gap-3">
                      <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-4 rounded-2xl text-xs font-black text-center">📞 اتصال</a>
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-1 bg-zinc-950 text-white py-4 rounded-2xl text-xs font-black">💬 دردشة</button>
                    </div>
                  ) : (
                    <button onClick={() => handleDeleteProduct(item.id)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs border border-red-100">🗑️ حذف الإعلان</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* مودال المحادثة الاحترافي (نصوص + فويس) */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center backdrop-blur-md">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[2.5rem] flex flex-col relative">
            <div className="p-5 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[2.5rem]">
               <h3 className="font-black">{messageModal.receiverName}</h3>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-3xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50">
               {myMessages.filter(m => m.fromId === messageModal.receiverId).map((msg, i) => (
                 <div key={i} className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 max-w-[85%]">
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-48" /> : <p className="text-sm font-bold">{msg.text}</p>}
                       <span className="text-[9px] text-zinc-400 block mt-2">{new Date(msg.date).toLocaleTimeString('ar-EG')}</span>
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t md:rounded-b-[2.5rem] flex gap-2 items-center">
               <button 
                 onMouseDown={startRecording} onMouseUp={stopRecording}
                 onTouchStart={startRecording} onTouchEnd={stopRecording}
                 className={`p-4 rounded-2xl ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-zinc-100 text-zinc-500'}`}
               >🎤</button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-sm" placeholder="اكتب..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-6 py-4 rounded-2xl font-black">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* زر الإضافة */}
      {!['support', 'inbox'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-yellow-400 text-black rounded-full shadow-2xl text-3xl font-black">+</button>
      )}
    </div>
  );
}

const TabButton = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2 rounded-2xl font-black text-sm ${active ? 'bg-zinc-950 text-yellow-400' : 'text-zinc-400'}`}>
    <span>{icon}</span><span>{label}</span>
  </button>
);
