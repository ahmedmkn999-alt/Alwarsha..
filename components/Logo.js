export default function Logo() {
  return (
    <svg width="200" height="70" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
      <text x="220" y="70" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="60" fill="#ffffff" textAnchor="end">الور</text>
      <g transform="translate(130, 20)">
        <path d="M10,0 L20,0 L20,30 L25,35 L5,35 L10,30 Z" fill="#f59e0b" />
        <rect x="12" y="35" width="6" height="25" fill="#e2e8f0" />
        <path d="M40,10 Q50,40 35,60" stroke="#f59e0b" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M60,10 Q50,40 65,60" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M15,60 Q40,80 65,60" stroke="#ffffff" strokeWidth="5" fill="none" />
      </g>
      <text x="125" y="70" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="60" fill="#ffffff" textAnchor="end">ــة</text>
    </svg>
  );
    }
    
