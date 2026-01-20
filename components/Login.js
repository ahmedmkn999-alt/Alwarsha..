import { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import Logo from './Logo';

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('INPUT_PHONE');

  useEffect(() => {
    // إعداد Recaptcha مرة واحدة فقط عند تحميل المكون
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  }, []);

  const sendOtp = async () => {
    const appVerifier = window.recaptchaVerifier;
    try {
      const formattedPhone = `+20${phone.replace(/^0+/, '')}`; // تنسيق الرقم المصري
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      window.confirmationResult = confirmationResult;
      setStep('INPUT_OTP');
    } catch (error) {
      console.error("Error sending SMS", error);
      alert("حدث خطأ في إرسال الكود، تأكد من الرقم");
    }
  };

  const verifyOtp = async () => {
    try {
      const result = await window.confirmationResult.confirm(code);
      onLogin(result.user);
    } catch (error) {
      console.error("Invalid Code", error);
      alert("الكود غير صحيح");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark text-white p-4" dir="rtl">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="mb-8 text-center">
          <Logo />
          <p className="text-gray-400 mt-2">بوابتك لكل قطع الغيار</p>
        </div>
        
        {step === 'INPUT_PHONE' ? (
          <>
            <label className="block text-sm mb-2 text-gray-300">رقم الهاتف</label>
            <input 
              type="tel" 
              placeholder="010xxxxxxxxx" 
              className="w-full p-4 mb-4 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-primary outline-none text-left"
              dir="ltr"
              onChange={(e) => setPhone(e.target.value)}
            />
            <div id="recaptcha-container"></div>
            <button onClick={sendOtp} className="w-full bg-primary text-dark py-3 rounded-lg font-bold text-lg hover:bg-amber-600 transition">
              إرسال كود التحقق
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm mb-2 text-gray-300">كود التحقق</label>
            <input 
              type="text" 
              placeholder="xxxxxx" 
              className="w-full p-4 mb-4 bg-slate-900 border border-slate-600 rounded-lg text-white text-center tracking-widest text-xl outline-none"
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={verifyOtp} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition">
              دخول الورشة
            </button>
          </>
        )}
      </div>
    </div>
  );
}
