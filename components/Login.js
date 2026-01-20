import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import Logo from './Logo';

export default function Login() {

  const handleGoogleLogin = async () => {
    // 1. هنعمل زرار "تحميل" بسيط عشان تعرف إنك دوست
    const btn = document.getElementById("loginBtn");
    if(btn) {
      btn.innerText = "جاري التحويل لجوجل...";
      btn.disabled = true;
    }

    // 2. التحويل لصفحة جوجل
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      alert("مشكلة في التحويل: " + error.message);
      if(btn) {
        btn.innerText = "تسجيل الدخول بجوجل";
        btn.disabled = false;
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6" dir="rtl">
      <div className="relative bg-zinc-900 p-10 rounded-3xl shadow-[0_0_30px_rgba(255,215,0,0.1)] w-full max-w-md border border-zinc-800 text-center">
        
        <div className="mb-10 flex justify-center scale-110">
           <Logo />
        </div>
        
        <h2 className="text-2xl font-bold mb-3 text-white font-cairo">مرحباً بك في <span className="text-primary">فولت</span></h2>
        <p className="text-gray-400 mb-10 text-sm">سجل دخولك لتبدأ البيع والشراء</p>

        <button 
          id="loginBtn"
          onClick={handleGoogleLogin} 
          className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-6 h-6"
          />
          تسجيل الدخول بجوجل
        </button>
      </div>
    </div>
  );
}
