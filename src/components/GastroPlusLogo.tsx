import React from 'react';

export function GastroPlusLogoIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer cradle line/arc at the bottom */}
      <path 
        d="M35 125C35 125 70 177 165 133C145 163 90 175 35 125Z" 
        fill="#C59B6D" 
      />
      
      {/* Lower Stomach (gold lobe) */}
      <path 
        d="M62 123C50 123 52 150 90 150C135 150 155 120 155 120C155 120 135 110 105 123C75 136 62 123 62 123Z" 
        fill="#C59B6D" 
      />
      
      {/* Upper Stomach (teal/green lobe) */}
      <path 
        d="M95 47C95 47 88 35 95 30C102 35 100 53 100 53C100 53 128 53 142 70C156 87 145 103 145 103C145 103 152 85 140 71C128 57 110 67 98 83C86 99 62 123 62 123C62 123 55 99 75 79C95 59 95 47 95 47Z" 
        fill="#1A5E63" 
      />
      
      {/* Medical Cross inside the upper lobe */}
      <rect x="110" y="63" width="20" height="7" rx="1" fill="white" />
      <rect x="116.5" y="56.5" width="7" height="20" rx="1" fill="white" />
    </svg>
  );
}

export function GastroPlusFullLogo({ showTagline = true, className = "" }: { showTagline?: boolean, className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Main Vector Logo */}
      <GastroPlusLogoIcon className="w-32 h-32 mb-2" />
      
      {/* Brand Name */}
      <div className="flex items-baseline justify-center font-serif tracking-tight mt-1" style={{ fontFamily: "Georgia, serif" }}>
        <span className="text-3xl font-bold text-[#1A5E63]">Gastro</span>
        <span className="text-3xl font-bold text-[#C59B6D]">Plus</span>
      </div>
      
      {/* Hospital Subtitle with decorative lines */}
      <div className="flex items-center justify-center gap-3 w-full max-w-[240px] mt-1">
        <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-[#C59B6D]" />
        <span className="text-xs font-bold tracking-[0.3em] text-[#C59B6D] uppercase">Hospital</span>
        <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-[#C59B6D]" />
      </div>
      
      {/* Tagline */}
      {showTagline && (
        <p className="text-[11px] italic font-serif text-[#1A5E63] mt-3 font-medium tracking-wide">
          Advanced Digestive and Surgical Care
        </p>
      )}
    </div>
  );
}
