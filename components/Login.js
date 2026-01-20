import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Logo from './Logo';

export default function Login({ onLogin }) {

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (error) {
      // السطر ده هيظهرلك رسالة فيها سبب المشكلة بالظبط
      alert("⚠️ كود الخطأ: " + error.code + "\n" + "الرسالة: " + error.message);
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6" dir="rtl">
      <div className="relative bg-zinc-900 p-10 rounded-3xl shadow-[0_0_30px_rgba(255,215,0,0.1)] w-full max-w-md border border-zinc-800 text-center">
        
        <div className="mb-10 flex justify-center scale-110">
           <Logo />
        </div>
        
        <h2 className="text-2xl font-bold mb-3 text-white" style={{fontFamily: 'Cairo, sans-serif'}}>مرحباً بك في <span className="text-primary">فولت</span></h2>
        <p className="text-gray-400 mb-10 text-sm">سجل دخولك لتبدأ البيع والشراء</p>

        <button 
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
