import { useState, useEffect, useRef } from 'react';
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
  
  // فويس WhatsApp Style
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);

  useEffect(() => {
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (const key in data) loaded.push({ id: key, ...data[key] });
      setProducts(loaded.reverse()); 
    });

    if (user?.uid) {
      onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
        const data = snapshot.val();
        const loadedMsgs = [];
        for (const key in data) loadedMsgs.push({ id: key, ...data[key] });
        setMyMessages(loadedMsgs);
      });
    }
  }, [user]);

  // --- منطق الفويس المطور ---
  const startRecording = async (e) => {
    try {
      touchStartPos.current = e.touches ? e.touches[0].clientX : e.clientX;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (ev) => chunks.push(ev.data);
      recorder.onstop = () => {
        if (!isCancelled) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => sendVoiceMsg(reader.result);
        }
        setIsCancelled(false);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert("فعل الميكروفون 🎤"); }
  };

  const handleDrag = (e) => {
    if (!isRecording) return;
    const currentPos = e.touches ? e.touches[0].clientX : e.clientX;
    if (currentPos - touchStartPos.current > 70) setIsCancelled(true);
    else setIsCancelled(false);
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMsg = (voiceData) => {
    const msgData = { fromName: user.displayName, fromId: user.uid, voice: voiceData, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
  };

  const sendMsgToSeller = () => {
    if(!msgText.trim()) return;
    const msgData = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
    setMsgText('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name) return alert("البيانات ناقصة");
    setUploading(true);
    push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
    .then(() => { setUploading(false); setShowModal(false); setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' }); });
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo" dir="rtl">
      
      {/* Header الاحترافي */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-20 md:w-28 cursor-pointer" onClick={() => setActiveTab('home')}><Logo /></div>
          <div className="flex-1 max-w-md mx-4 relative hidden md:block">
            <input className="w-full bg-zinc-900 border-none rounded-2xl p-2.5 pr-10 text-xs text-white focus:ring-1 focus:ring-yellow-400 outline-none" placeholder="ابحث في فولت..." onChange={(e) => setSearchTerm(e.target.value)} />
            <span className="absolute right-3 top-2.5 opacity-40">🔍</span>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveTab('inbox')} className={`relative p-2.5 rounded-2xl transition-all ${activeTab === 'inbox' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                <span className="text-xl">📩</span>
                {myMessages.filter(m => m.fromId !== user.uid).length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-zinc-950">!</span>}
             </button>
             <button onClick={() => setActiveTab('profile')} className="group active:scale-90 transition-transform"><img src={user.photoURL} className={`w-10 h-10 rounded-full border-2 object-cover ${activeTab === 'profile' ? 'border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'border-zinc-700'}`} /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 animate-fadeIn">
        
        {/* الصفحة الرئيسية بلمسة فنية */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.04)] border border-gray-50 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="h-64 relative overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute top-4 right-4 bg-yellow-400 text-black px-4 py-1.5 rounded-2xl font-black text-[10px] shadow-lg">{item.condition === 'new' ? '✨ جديد' : '🛠️ مستعمل'}</div>
                </div>
                <div className="p-7">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-xl text-zinc-900 line-clamp-1">{item.name}</h3>
                    <div className="text-zinc-950 font-black text-xl">{item.price} <span className="text-xs">ج.م</span></div>
                  </div>
                  {user.uid !== item.sellerId ? (
                    <div className="flex gap-3">
                      <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-4 rounded-2xl text-xs font-black text-center hover:bg-zinc-200 transition-all active:scale-95">📞 اتصال</a>
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-[2] bg-zinc-950 text-white py-4 rounded-2xl text-xs font-black shadow-xl hover:bg-yellow-400 hover:text-black transition-all active:scale-95">دردشة 💬</button>
                    </div>
                  ) : (
                    <button onClick={() => remove(ref(db, `products/${item.id}`))} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs border border-red-100 hover:bg-red-600 hover:text-white transition-all">حذف إعلانك 🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* المحادثات (الواتساب ستايل) */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-black mb-8 pr-4 border-r-4 border-yellow-400">المحادثات</h2>
            {[...new Map(myMessages.filter(m => m.fromId !== user.uid).map(m => [m.fromId, m])).values()].map(chat => (
              <div key={chat.id} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId, receiverName: chat.fromName })} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center gap-5 cursor-pointer hover:border-yellow-400 hover:shadow-lg transition-all active:scale-[0.98]">
                <div className="w-14 h-14 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black text-xl">{chat.fromName[0]}</div>
                <div className="flex-1">
                  <h4 className="font-black text-zinc-900">{chat.fromName === 'Admin' ? '⚡ إدارة فولت' : chat.fromName}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-1">{chat.voice ? "🎤 رسالة صوتية" : chat.text}</p>
                </div>
                <span className="text-[10px] text-zinc-300">{new Date(chat.date).toLocaleDateString('ar-EG')}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* شاشة الشات المفتوحة (تصميم فخم) */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center backdrop-blur-md p-0 md:p-6">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[3rem] flex flex-col shadow-2xl relative animate-slideUp">
            <div className="p-6 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[3rem]">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-950 text-yellow-400 flex items-center justify-center font-black">V</div>
                  <h3 className="font-black text-lg">{messageModal.receiverName}</h3>
               </div>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-4xl text-zinc-300 hover:text-black transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-zinc-50/50 flex flex-col">
               {myMessages
                 .filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId)
                 .sort((a,b) => new Date(a.date) - new Date(b.date))
                 .map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-5 rounded-[1.8rem] shadow-sm max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-white text-zinc-800 rounded-tl-none border border-gray-100'}`}>
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-44" /> : <p className="text-sm font-bold leading-relaxed">{msg.text}</p>}
                       <span className="text-[9px] opacity-40 block mt-2">{new Date(msg.date).toLocaleTimeString('ar-EG')}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-6 bg-white border-t md:rounded-b-[3rem] flex gap-3 items-center relative">
               <button 
                 onMouseDown={startRecording} onMouseUp={stopRecording}
                 onTouchStart={startRecording} onTouchEnd={stopRecording}
                 onMouseMove={handleDrag} onTouchMove={handleDrag}
                 className={`p-5 rounded-[1.5rem] transition-all duration-300 ${isRecording ? (isCancelled ? 'bg-zinc-800 text-red-500 scale-125' : 'bg-red-500 text-white scale-125 shadow-[0_0_20px_rgba(239,68,68,0.4)]') : 'bg-zinc-100 text-zinc-400'}`}
               >
                 {isCancelled ? '🗑️' : (isRecording ? '🛑' : '🎤')}
               </button>
               
               <div className="flex-1 relative">
                 <input 
                   className="w-full bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-sm" 
                   placeholder={isRecording ? (isCancelled ? "اترك للحذف" : "اسحب يمين للإلغاء ➡️") : "اكتب رسالتك..."} 
                   value={msgText} 
                   onChange={(e) => setMsgText(e.target.value)} 
                   disabled={isRecording}
                 />
               </div>
               
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-7 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {!['inbox'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-10 w-20 h-20 bg-yellow-400 text-black rounded-full shadow-[0_10px_30px_rgba(255,215,0,0.4)] text-4xl font-black hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white">+</button>
      )}
    </div>
  );
}
