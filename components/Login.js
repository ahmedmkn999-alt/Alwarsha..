import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function Login() {

  const handleGoogleLogin = async () => {
    const btn = document.getElementById("loginBtn");
    if(btn) {
      btn.innerText = "جاري الدخول للورشة...";
      btn.disabled = true;
    }

    const provider = new GoogleAuthProvider();
    auth.languageCode = 'ar';

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("خطأ في الدخول:", error);
      alert("عذراً، حدث خطأ أثناء الدخول للورشة: " + error.message);
      if(btn) {
        btn.innerText = "دخول الورشة بجوجل";
        btn.disabled = false;
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 font-cairo" dir="rtl">
      <div className="relative bg-zinc-900 p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(255,215,0,0.15)] w-full max-w-md border border-zinc-800 text-center animate-fadeIn">
        
        {/* تصميم شعار الورشة الجديد بدلاً من فولت */}
        <div className="mb-10 flex flex-col items-center justify-center scale-125">
           <div className="relative w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)] border-4 border-black overflow-hidden">
              <span className="text-black text-4xl font-black italic">W</span>
              {/* تأثير الترس حول اللوجو */}
              <div className="absolute inset-0 border-[6px] border-dashed border-black rounded-full animate-spin-slow opacity-20"></div>
           </div>
           <h1 className="text-yellow-400 font-black text-xl mt-3 tracking-tighter italic">AL-WARSHA</h1>
        </div>
        
        <h2 className="text-3xl font-black mb-3 text-white">مرحباً بك في <span className="text-yellow-400">الورشة</span></h2>
        <p className="text-zinc-500 mb-10 text-sm">سجل دخولك الآن لتبدأ رحلتك في الورشة</p>

        <button 
          id="loginBtn"
          onClick={handleGoogleLogin} 
          className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-yellow-400 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-6 h-6"
          />
          دخول الورشة بجوجل
        </button>
        
        {/* توقيع أحمد الذهبي الفخم */}
        <div className="mt-10 pt-6 border-t border-zinc-800/50">
          <p className="text-[14px] text-[#D4AF37] font-black uppercase tracking-[0.4em] italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            AHMED
          </p>
          <p className="text-[8px] text-zinc-700 font-bold mt-1 tracking-widest">EST. 2026</p>
        </div>
      </div>
    </div>
  );
}
