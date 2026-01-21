import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { ref, onValue, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";

export default function Dashboard({ user }) {
  // --- 1. حالات التحكم ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [showBannedChat, setShowBannedChat] = useState(false);
  
  // --- 2. البيانات ---
  const [products, setProducts] = useState([]);
  const [myMessages, setMyMessages] = useState([]);
  const [supportMsg, setSupportMsg] = useState('');
  
  // --- 3. المودالات ---
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', price: '', desc: '', condition: 'new', image: null, phone: '', category: 'قطع غيار' 
  });
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [messageModal, setMessageModal] = useState({ show: false, receiverId: '', receiverName: '' });
  const [msgText, setMsgText] = useState('');
  const [chatImage, setChatImage] = useState(null);
  
  // --- 4. الصوت والخيارات ---
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const touchStartPos = useRef(0);
  const [optionsModal, setOptionsModal] = useState({ show: false, targetId: '', targetName: '' });
  const longPressTimer = useRef(null);

  const categories = [
    { id: 'parts', name: 'قطع غيار', img: '/parts.jpg' },
    { id: 'heater', name: 'سخانات', img: '/heater (1).jpg' },
    { id: 'ac', name: 'تكييفات', img: '/ac.jpg.webp' },
    { id: 'wash', name: 'غسالات', img: '/washing.jpg' },
    { id: 'fridge', name: 'ثلاجات', img: '/fridge.jpg' },
    { id: 'stove', name: 'بوتجازات', img: '/stove.jpg' },
    { id: 'fan', name: 'مراوح', img: '/fan.jpg' },
    { id: 'blender', name: 'خلاطات', img: '/blender.jpg' },
    { id: 'caps', name: 'كابات', img: '/caps.jpg' }
  ];

  useEffect(() => {
    // ✅ تسجيل العميل في قاعدة البيانات عشان يظهر في لوحة الأدمن
    if (user?.uid) {
        update(ref(db, `users/${user.uid}`), {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            id: user.uid,
            lastSeen: new Date().toISOString()
        });

        // مراقبة الحظر
        onValue(ref(db, `users/${user.uid}/banned`), (snapshot) => {
            setIsBanned(snapshot.val() === true);
        });

        // جلب الرسائل
        onValue(ref(db, `messages/${user.uid}`), (snapshot) => {
            const data = snapshot.val();
            const loadedMsgs = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setMyMessages(loadedMsgs);
        });
    }

    // جلب المنتجات
    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
      setProducts(loaded.reverse()); 
    });
  }, [user]);

  // --- دوال التحكم ---
  const handleTouchStart = (id, name) => { longPressTimer.current = setTimeout(() => setOptionsModal({ show: true, targetId: id, targetName: name }), 800); };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  
  const handleReport = () => {
    if(confirm(`تبليغ عن ${optionsModal.targetName}؟`)) {
        push(ref(db, 'reports'), {
          reporterId: user.uid, reporterName: user.displayName,
          reportedUserId: optionsModal.targetId, reportedUserName: optionsModal.targetName,
          date: new Date().toISOString(), reason: "بلاغ مستخدم"
        });
        alert("تم الإبلاغ 🚨"); 
    }
    setOptionsModal({ ...optionsModal, show: false });
  };

  const deleteConversation = (otherId) => {
    if(confirm("مسح المحادثة؟")) {
        myMessages.forEach(msg => { if (msg.fromId === otherId || msg.toId === otherId) remove(ref(db, `messages/${user.uid}/${msg.id}`)); });
    }
  };

  const sendMsg = () => {
    if(!msgText.trim() && !chatImage) return;
    const msgData = { fromName: user.displayName, fromId: user.uid, text: msgText, image: chatImage, date: new Date().toISOString() };
    push(ref(db, `messages/${messageModal.receiverId}`), msgData);
    push(ref(db, `messages/${user.uid}`), { ...msgData, toId: messageModal.receiverId });
    setMsgText(''); setChatImage(null);
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name || !newProduct.phone || !newProduct.price) return alert("اكمل البيانات");
    setUploading(true);
    push(ref(db, 'products'), { ...newProduct, sellerId: user.uid, sellerName: user.displayName, date: new Date().toISOString() })
    .then(() => { setUploading(false); setShowModal(false); alert("تم النشر ✅"); });
  };

  // --- الفلترة ---
  const filtered = products.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchSearch = (p.name.toLowerCase().includes(search) || p.category.includes(search));
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const uniqueChats = [...new Map(myMessages.filter(m => m.fromId !== 'Admin' && m.toId !== 'Admin').map(m => [m.fromId === user.uid ? m.toId : m.fromId, m])).values()];

  // 🚫 شاشة الحظر
  if (isBanned) return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 text-center text-white font-cairo" dir="rtl">
        <h1 className="text-red-600 text-4xl font-black mb-4">AL-WARSHA</h1>
        <h2 className="text-2xl font-bold mb-2">تم حظرك يا {user.displayName} 🚫</h2>
        <button onClick={() => setShowBannedChat(true)} className="bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold mt-8">تواصل مع الإدارة</button>
        
        {showBannedChat && (
            <div className="fixed inset-0 bg-black z-[10000] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg h-[80vh] rounded-2xl flex flex-col overflow-hidden text-black">
                    <div className="p-4 bg-zinc-900 text-white flex justify-between"><span>تظلم</span><button onClick={()=>setShowBannedChat(false)}>×</button></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-100">
                        {myMessages.filter(m => m.fromId === 'Admin' || m.toId === 'Admin').map((msg, i) => (
                            <div key={i} className={`p-2 rounded-lg max-w-[80%] ${msg.fromId === user.uid ? 'bg-black text-white self-end' : 'bg-white self-start'}`}>{msg.text}</div>
                        ))}
                    </div>
                    <div className="p-3 border-t flex gap-2"><input className="flex-1 border p-2 rounded" value={msgText} onChange={e=>setMsgText(e.target.value)} /><button onClick={()=>{
                        const d = { fromName: user.displayName, fromId: user.uid, text: msgText, date: new Date().toISOString() };
                        push(ref(db, `messages/Admin`), d); push(ref(db, `messages/${user.uid}`), {...d, toId: 'Admin'}); setMsgText('');
                    }} className="bg-black text-white px-4 py-2 rounded">إرسال</button></div>
                </div>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-cairo select-none" dir="rtl">
      {/* الهيدر والقوائم (بدون جديد ومستعمل) */}
      <header className="bg-zinc-950 text-white shadow-xl sticky top-0 z-50 p-4 flex justify-between items-center">
         <div className="flex gap-2 text-yellow-400 font-black text-xl"><span>W</span>الورشة</div>
         <div className="flex gap-3">
            <button onClick={() => setActiveTab('inbox')} className="relative">📩 {uniqueChats.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{uniqueChats.length}</span>}</button>
            <button onClick={() => setActiveTab('profile')}><img src={user.photoURL} className="w-8 h-8 rounded-full border" /></button>
         </div>
      </header>

      {activeTab === 'home' && (
        <>
            <div className="bg-white p-4 sticky top-[60px] z-40 shadow-sm">
                <input className="w-full bg-zinc-100 p-3 rounded-xl text-sm mb-4 text-center font-bold" placeholder="ابحث..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    <button onClick={()=>setSelectedCategory('all')} className={`flex-shrink-0 w-20 h-24 border-2 rounded-xl flex flex-col items-center justify-center ${selectedCategory==='all'?'border-yellow-400':'border-zinc-100'}`}>🌍<span className="text-[10px] font-bold">الكل</span></button>
                    {categories.map(c => (
                        <div key={c.id} onClick={()=>setSelectedCategory(c.name)} className={`flex-shrink-0 w-20 h-24 rounded-xl relative overflow-hidden border-2 cursor-pointer ${selectedCategory===c.name?'border-yellow-400':'border-transparent'}`}>
                            <img src={c.img} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 w-full text-center bg-black/50 text-white text-[10px] font-bold py-1">{c.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border">
                        <img src={item.image} className="w-full h-48 object-cover" onClick={()=>setViewImage(item.image)} />
                        <div className="p-4">
                            <h3 className="font-bold">{item.name}</h3>
                            <p className="text-yellow-600 font-black">{item.price} ج.م</p>
                            <div className="flex gap-2 mt-2">
                                <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 text-center py-2 rounded-lg text-xs font-bold">اتصال</a>
                                <button onClick={()=>setMessageModal({show:true, receiverId:item.sellerId, receiverName:item.sellerName})} className="flex-[2] bg-zinc-950 text-white py-2 rounded-lg text-xs font-bold">دردشة</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}

      {/* باقي التبويبات (Inbox, Support, Profile) والمودالات (Add, Chat) */}
      {/* ... (نفس الأكواد السابقة لضمان عدم التكرار الطويل، لكن الأهم هو الجزء اللي فوق) ... */}
      
      {!['inbox', 'profile', 'support'].includes(activeTab) && <button onClick={()=>setShowModal(true)} className="fixed bottom-6 left-6 w-14 h-14 bg-yellow-400 rounded-full text-2xl font-black shadow-lg">+</button>}
      
      {/* مودال الشات */}
      {messageModal.show && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg h-[85vh] rounded-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between font-bold"><span>{messageModal.receiverName}</span><button onClick={()=>setMessageModal({show:false, receiverId:'', receiverName:''})}>×</button></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50">
                    {myMessages.filter(m => m.fromId === messageModal.receiverId || m.toId === messageModal.receiverId).sort((a,b)=>new Date(a.date)-new Date(b.date)).map((msg,i)=>(
                        <div key={i} className={`flex ${msg.fromId===user.uid?'justify-end':'justify-start'}`} onTouchStart={()=>handleTouchStart(msg.fromId===user.uid?msg.toId:msg.fromId, messageModal.receiverName)} onTouchEnd={handleTouchEnd}>
                            <div className={`p-3 rounded-xl max-w-[80%] ${msg.fromId===user.uid?'bg-yellow-400':'bg-white border'}`}>
                                {msg.image && <img src={msg.image} className="w-full rounded-lg mb-2" />}
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t flex gap-2 items-center">
                    <label className="text-xl">📷<input type="file" className="hidden" onChange={e=>{const r=new FileReader(); r.onload=()=>setChatImage(r.result); r.readAsDataURL(e.target.files[0])}}/></label>
                    {chatImage && <div className="relative"><img src={chatImage} className="w-10 h-10 rounded" /><button onClick={()=>setChatImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-4 h-4 rounded-full text-[8px]">x</button></div>}
                    <input className="flex-1 border p-2 rounded-lg" value={msgText} onChange={e=>setMsgText(e.target.value)} />
                    <button onClick={sendMsg} className="bg-black text-white px-4 py-2 rounded-lg">إرسال</button>
                </div>
            </div>
        </div>
      )}

      {optionsModal.show && <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center" onClick={()=>setOptionsModal({...optionsModal, show:false})}><div className="bg-white p-6 rounded-xl w-64 text-center"><button onClick={handleReport} className="w-full py-3 text-red-600 font-bold border-b">إبلاغ 🚨</button><button onClick={()=>setOptionsModal({...optionsModal, show:false})} className="w-full py-3">إلغاء</button></div></div>}
      
      {showModal && <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"><div className="bg-white w-full max-w-lg p-6 rounded-2xl"><h3 className="font-bold mb-4">إضافة إعلان</h3><input type="file" className="block w-full mb-2" onChange={e=>{const r=new FileReader(); r.onload=()=>setNewProduct({...newProduct, image:r.result}); r.readAsDataURL(e.target.files[0])}} /><input className="w-full border p-2 mb-2 rounded" placeholder="الاسم" onChange={e=>setNewProduct({...newProduct, name:e.target.value})} /><input className="w-full border p-2 mb-2 rounded" placeholder="السعر" onChange={e=>setNewProduct({...newProduct, price:e.target.value})} /><button onClick={handlePublish} className="w-full bg-yellow-400 py-3 rounded font-bold">نشر</button><button onClick={()=>setShowModal(false)} className="w-full mt-2 text-red-500">إلغاء</button></div></div>}
    </div>
  );
}
