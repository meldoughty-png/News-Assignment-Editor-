import React from 'react';
import { motion } from "motion/react";

export const BrandSymbol: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Glow */}
      <defs>
        <radialGradient id="oceanGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0.6" />
        </radialGradient>
        
        <linearGradient id="ibisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-ibis)" />
          <stop offset="100%" stopColor="var(--color-brand-sunset)" />
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* The "Steelpan" Base - Concentric circles and note divisions */}
      <circle cx="50" cy="50" r="45" fill="url(#oceanGradient)" stroke="currentColor" strokeWidth="1" className="text-white/20" />
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="text-white/30" />
      
      {/* Stylized Notes (Nodes) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * 38;
        const y = 50 + Math.sin(rad) * 38;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill="currentColor" className="text-white/40" />
        );
      })}

      {/* The "N" formed by stylized Hummingbird wings in flight */}
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        d="M35 65 L35 35 L50 50 L65 35 L65 65"
        stroke="url(#ibisGradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* Central AI Node */}
      <circle cx="50" cy="55" r="4" fill="#fff" filter="url(#glow)">
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Caribbean Ripple Accents */}
      <circle cx="50" cy="50" r="48" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.3">
        <animate attributeName="r" values="40;48;40" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};
