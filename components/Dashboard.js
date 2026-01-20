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
  
  // حالات الفويس المتقدمة
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

  // --- وظائف التسجيل المتطورة ---
  const startRecording = async (e) => {
    try {
      // تحديد نقطة البداية للمس (للإلغاء بالسحب)
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

  const handleTouchMove = (e) => {
    if (!isRecording) return;
    const currentPos = e.touches ? e.touches[0].clientX : e.clientX;
    // إذا سحب لليمين بمقدار 60 بكسل
    if (currentPos - touchStartPos.current > 60) {
      setIsCancelled(true);
    }
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

  // --- وظائف المنتجات والدعم ---
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
    if (!newProduct.image) return alert("ارفع صورة أولاً");
    setUploading(true);
    push(ref(db, 'products'), {
      ...newProduct,
      sellerId: user.uid,
      sellerName: user.displayName,
      date: new Date().toISOString()
    }).then(() => {
      setUploading(false);
      setShowModal(false);
      setNewProduct({ name: '', price: '', desc: '', condition: 'new', image: null, phone: '' });
    });
  };

  const sendSupport = () => {
    if(!supportMsg) return;
    push(ref(db, 'support'), { userId: user.uid, userName: user.displayName, msg: supportMsg, date: new Date().toISOString() });
    setSupportMsg('');
    alert("تم الإرسال للدعم ⚡");
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo" dir="rtl">
      {/* Header مع البحث */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-24 cursor-pointer" onClick={() => setActiveTab('home')}><Logo /></div>
          <input 
            className="flex-1 max-w-md mx-4 bg-zinc-900 border-none rounded-xl p-2 text-xs text-center"
            placeholder="ابحث عن أي حاجة..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('inbox')} className="relative p-2 rounded-xl bg-zinc-900">📩</button>
             <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className="w-9 h-9 rounded-full border-2 border-zinc-700" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* المحادثات */}
        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl font-black mb-6">المحادثات</h2>
            {[...new Map(myMessages.filter(m => m.fromId !== user.uid).map(m => [m.fromId, m])).values()].map(chat => (
              <div key={chat.id} onClick={() => setMessageModal({ show: true, receiverId: chat.fromId, receiverName: chat.fromName })} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-yellow-400 transition-all">
                <div className="w-12 h-12 rounded-full bg-zinc-900 text-yellow-400 flex items-center justify-center font-black">{chat.fromName[0]}</div>
                <div className="flex-1">
                  <h4 className="font-black text-sm">{chat.fromName}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-1">{chat.voice ? "🎤 رسالة صوتية" : chat.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* الصفحة الرئيسية */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden group">
                <img src={item.image} className="h-64 w-full object-cover" />
                <div className="p-6 text-right">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-lg">{item.name}</h3>
                    <span className="text-xs bg-yellow-400 px-2 py-1 rounded-lg font-bold">{item.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-4 h-8 overflow-hidden">{item.desc}</p>
                  <div className="flex gap-3">
                    <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-center font-bold text-xs">📞</a>
                    <button onClick={() => setMessageModal({ show: true, receiverId: item.sellerId, receiverName: item.sellerName })} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-bold text-xs">دردشة 💬</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* الدعم الفني */}
        {activeTab === 'support' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl text-center">
            <h2 className="text-2xl font-black mb-4">الدعم الفني 🎧</h2>
            <textarea 
               className="w-full bg-zinc-50 border-none rounded-2xl p-4 text-sm mb-4 outline-none min-h-[150px]"
               placeholder="اكتب مشكلتك هنا..."
               value={supportMsg}
               onChange={(e) => setSupportMsg(e.target.value)}
            />
            <button onClick={sendSupport} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black">إرسال للمراجعة</button>
          </div>
        )}
      </main>

      {/* شاشة المحادثة الاحترافية */}
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

            {/* منطقة الكتابة والفويس المطور */}
            <div className="p-5 bg-white border-t md:rounded-b-[2.5rem] flex gap-2 items-center relative">
               <button 
                 onMouseDown={startRecording} onMouseUp={stopRecording}
                 onTouchStart={startRecording} onTouchEnd={stopRecording}
                 onMouseMove={handleTouchMove} onTouchMove={handleTouchMove}
                 className={`p-5 rounded-2xl transition-all ${isRecording ? 'bg-red-500 text-white scale-125' : 'bg-zinc-100 text-zinc-500'}`}
               >
                 {isCancelled ? '🗑️' : '🎤'}
               </button>
               
               <input 
                 className="flex-1 bg-zinc-100 p-4 rounded-2xl outline-none font-bold text-sm" 
                 placeholder={isRecording ? "اسحب لليمين للإلغاء ➡️" : "اكتب رسالتك..."} 
                 value={msgText} 
                 onChange={(e) => setMsgText(e.target.value)} 
                 disabled={isRecording}
               />
               
               <button onClick={sendMsgToSeller} className="bg-zinc-950 text-white px-6 py-4 rounded-2xl font-black">إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* زر إضافة إعلان (المودال) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] animate-slideUp">
             <h2 className="text-2xl font-black mb-6">نشر إعلان جديد 🚀</h2>
             <form onSubmit={handlePublish} className="space-y-4">
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full text-xs" />
                <input placeholder="اسم المنتج" className="w-full bg-zinc-100 p-4 rounded-xl" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <div className="flex gap-2">
                   <input placeholder="السعر" className="flex-1 bg-zinc-100 p-4 rounded-xl" onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                   <select className="bg-zinc-100 p-4 rounded-xl" onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
                      <option value="new">جديد</option>
                      <option value="used">مستعمل</option>
                   </select>
                </div>
                <input placeholder="رقم الهاتف" className="w-full bg-zinc-100 p-4 rounded-xl" onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                <textarea placeholder="وصف قصير" className="w-full bg-zinc-100 p-4 rounded-xl h-24" onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
                <button type="submit" disabled={uploading} className="w-full bg-yellow-400 py-4 rounded-2xl font-black">{uploading ? 'جاري النشر...' : 'نشر الآن'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="w-full text-zinc-400 text-sm">إلغاء</button>
             </form>
          </div>
        </div>
      )}

      {!['inbox', 'support'].includes(activeTab) && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-yellow-400 text-black rounded-full shadow-2xl text-3xl font-black">+</button>
      )}
    </div>
  );
}
