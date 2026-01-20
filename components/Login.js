import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"; // تم تغيير النوع هنا
import Logo from './Logo';

export default function Login() {

  const handleGoogleLogin = async () => {
    const btn = document.getElementById("loginBtn");
    if(btn) {
      btn.innerText = "جاري فتح نافذة جوجل...";
      btn.disabled = true;
    }

    const provider = new GoogleAuthProvider();
    
    // ضبط إعدادات اللغة لتكون بالعربية
    auth.languageCode = 'ar';

    try {
      // استخدام Popup بدلاً من Redirect لتجنب مشكلة sessionStorage
      await signInWithPopup(auth, provider);
      // بمجرد النجاح، الصفحة هتعمل تحديث تلقائي وتدخلك للـ Dashboard
    } catch (error) {
      console.error("خطأ في الدخول:", error);
      alert("مشكلة في تسجيل الدخول: " + error.message);
      if(btn) {
        btn.innerText = "تسجيل الدخول بجوجل";
        btn.disabled = false;
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 font-cairo" dir="rtl">
      <div className="relative bg-zinc-900 p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(255,215,0,0.1)] w-full max-w-md border border-zinc-800 text-center animate-fadeIn">
        
        <div className="mb-10 flex justify-center scale-125">
           <Logo />
        </div>
        
        <h2 className="text-3xl font-black mb-3 text-white">مرحباً بك في <span className="text-yellow-400">فولت</span></h2>
        <p className="text-zinc-500 mb-10 text-sm">سجل دخولك الآن لتبدأ رحلتك في فولت</p>

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
          تسجيل الدخول بجوجل
        </button>
        
        <p className="mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Powered by Firebase & Vercel</p>
      </div>
    </div>
  );
}
