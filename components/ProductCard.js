import React from 'react';

export default function ProductCard({ item, onViewImage, onChat, isOwner, onDelete }) {
  return (
    <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
      {/* صورة المنتج */}
      <div className="h-60 overflow-hidden relative">
        <img 
          src={item.image} 
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-700" 
          onClick={() => onViewImage(item.image)} 
          alt={item.name}
        />
        <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-xl font-black text-[9px] shadow-md">
          {item.category}
        </div>
        {isOwner && (
            <button onClick={() => onDelete(item.id)} className="absolute top-3 left-3 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md font-bold z-10">
                🗑️
            </button>
        )}
      </div>

      {/* تفاصيل المنتج */}
      <div className="p-6 text-right">
        <h3 className="font-black text-sm mb-4 line-clamp-1">
          {item.name} 
          <span className="text-[10px] text-zinc-300 font-normal mr-1">
            ({item.condition === 'new' ? 'جديد' : 'مستعمل'})
          </span>
        </h3>
        <div className="font-black text-yellow-600 italic mb-4 text-lg">
          {item.price} ج.م
        </div>
        
        {/* الزراير */}
        <div className="flex gap-2">
          <a href={`tel:${item.phone}`} className="flex-1 bg-zinc-100 py-3 rounded-xl text-[10px] font-black text-center border hover:bg-zinc-200 transition-colors text-black no-underline">
            📞 اتصال
          </a>
          {!isOwner && (
            <button onClick={() => onChat(item)} className="flex-[2] bg-zinc-950 text-white py-3 rounded-xl font-black text-[10px] hover:bg-yellow-400 hover:text-black transition-colors">
                💬 دردشة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
