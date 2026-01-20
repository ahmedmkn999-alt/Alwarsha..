import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Logo from './Logo';

export default function Login({ onLogin }) {

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // الدخول نجح، نرسل بيانات المستخدم للموقع الرئيسي
      onLogin(result.user);
    } catch (error) {
      console.error("Google Error:", error);
      alert("حدث خطأ أثناء محاولة الدخول بجوجل. يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark text-white p-4" dir="rtl">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 text-center">
        
        {/* اللوجو */}
        <div className="mb-8 flex justify-center scale-90">
           <Logo />
        </div>
        
        <h2 className="text-xl font-bold mb-2 text-primary">أهلاً بك في الورشة 🔧</h2>
        <p className="text-gray-400 mb-8">سجل دخولك وابدأ البيع والشراء فوراً</p>

        {/* زر جوجل الوحيد */}
        <button 
          onClick={handleGoogleLogin} 
          className="w-full bg-white text-slate-900 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-6 h-6"
          />
          تسجيل الدخول باستخدام Google
        </button>

        <p className="mt-8 text-xs text-gray-500">
          دخول آمن 100% ومحمي بواسطة Google
        </p>

      </div>
    </div>
  );
              }
              
