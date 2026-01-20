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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

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
        setMyMessages(loadedMsgs); // نترك الترتيب للـ Map في العرض
      });
    }
  }, [user]);

  // إرسال النص (عند الطرفين)
  const sendMsgToSeller = () => {
    if(!msgText.trim()) return;
    const msgData = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() };
    
    push(ref(db, `messages/${messageModal.receiverId}`), msgData); // للمستلم
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId }); // لك
    setMsgText('');
  };

  // إرسال الفويس (عند الطرفين)
  const sendVoiceMsg = (voiceData) => {
    const msgData = { fromName: user.displayName, fromId: user.uid, voice: voiceData, date: new Date().toISOString() };
    
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => sendVoiceMsg(reader.result);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert("فعل الميكروفون 🎤"); }
  };

  const stopRecording = () => { mediaRecorder?.stop(); setIsRecording(false); };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo" dir="rtl">
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-24 cursor-pointer" onClick={() => setActiveTab('home')}><Logo /></div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('inbox')} className="relative p-2 rounded-xl bg-zinc-900 text-gray-400">📩</button>
             <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className="w-9 h-9 rounded-full border-2 border-zinc-700" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-3 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">المحادثات</h2>
            {[...new Map(myMessages.filter(m => m.fromId !== user.uid).map(m => [m.fromId, m])).values()].map(chat => (
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

        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden group">
                <img src={item.image} className="h-64 w-full object-cover" />
                <div className="p-6">
                  <h3 className="font-black text-lg mb-4">{item.name}</h3>
                  {user.uid !== item.sellerId ? (
                    <div className="flex gap-3">
                      <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-4 rounded-2xl text-xs font-black text-center">📞 اتصال</a>
                      <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-1 bg-zinc-950 text-white py-4 rounded-2xl text-xs font-black">💬 دردشة</button>
                    </div>
                  ) : (
                    <button onClick={() => remove(ref(db, `products/${item.id}`))} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs border border-red-100">🗑️ حذف</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* شاشة المحادثة المفتوحة */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center backdrop-blur-md">
          <div className="bg-white w-full max-w-lg h-full md:h-[85vh] md:rounded-[2.5rem] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-zinc-50 md:rounded-t-[2.5rem]">
               <h3 className="font-black">{messageModal.receiverName}</h3>
               <button onClick={() => setMessageModal({ show: false, receiverId: '', receiverName: '' })} className="text-3xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50 flex flex-col">
               {myMessages
                 .filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId)
                 .sort((a,b) => new Date(a.date) - new Date(b.date))
                 .map((msg, i) => (
                 <div key={i} className={`flex ${msg.fromId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm max-w-[85%] ${msg.fromId === user.uid ? 'bg-yellow-400 text-black rounded-tl-none' : 'bg-white text-zinc-800 rounded-tr-none border border-gray-100'}`}>
                       {msg.voice ? <audio src={msg.voice} controls className="h-8 w-48" /> : <p className="text-sm font-bold">{msg.text}</p>}
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-white border-t md:rounded-b-[2.5rem] flex gap-2 items-center">
               <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-4 rounded-2xl ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-zinc-100 text-zinc-500'}`}>🎤</button>
               <input className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-sm" placeholder="اكتب..." value={msgText} onChange={(e) => setMsgText(e.target.value)} />
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-6 py-4 rounded-2xl font-black">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {!['inbox'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-yellow-400 text-black rounded-full shadow-2xl text-3xl font-black">+</button>
      )}
    </div>
  );
}
