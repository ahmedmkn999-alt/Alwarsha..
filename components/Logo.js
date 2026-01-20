// components/Logo.js
export default function Logo() {
  return (
    <svg width="180" height="60" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
      {/* الأيقونة: ترس وبداخله كهرباء */}
      <g transform="translate(20, 10)">
        {/* الترس الخارجي */}
        <path d="M40,0 L50,0 L55,10 L65,10 L70,0 L80,0 L85,15 L95,20 L110,10 L115,20 L105,30 L110,40 L120,45 L115,55 L100,55 L95,65 L110,75 L100,80 L90,75 L80,80 L75,95 L65,95 L60,85 L50,85 L45,95 L35,95 L30,80 L20,80 L10,75 L25,65 L20,55 L5,55 L0,45 L10,40 L15,30 L5,20 L10,10 L25,20 L35,15 Z" fill="#FFD700"/>
        {/* دائرة مفرغة */}
        <circle cx="60" cy="48" r="30" fill="#18181B"/>
        {/* علامة الصاعقة (الكهرباء) */}
        <path d="M65,25 L45,50 L60,50 L55,75 L75,50 L60,50 Z" fill="#FFD700"/>
      </g>

      {/* اسم الموقع: فولت */}
      <text x="140" y="70" fontFamily="Segoe UI, Arial, sans-serif" fontWeight="900" fontSize="70" fill="#ffffff" letterSpacing="2">فولت</text>
      
      {/* شعار صغير */}
      <text x="210" y="90" fontFamily="Arial, sans-serif" fontSize="14" fill="#A1A1AA" textAnchor="middle">لقطع الغيار</text>
    </svg>
  );
}
