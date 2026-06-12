/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface MascotProps {
  expression: "happy" | "thinking" | "excited" | "proud" | "confused";
  speechBubble?: string;
  onAskAI?: () => void;
  isAiLoading?: boolean;
}

export default function MascotBito({ expression, speechBubble, onAskAI, isAiLoading }: MascotProps) {
  // SVG Face renderings on the digital heart-visor screen
  const renderFace = () => {
    switch (expression) {
      case "happy":
        return (
          <>
            {/* Soft, happy curved visor-eyes */}
            <path d="M 14,24 Q 18,20 22,24" stroke="#58cc02" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 28,24 Q 32,20 36,24" stroke="#58cc02" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Cyber smiley beak */}
            <path d="M 22,31 Q 25,35 28,31" stroke="#ff9000" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case "excited":
        return (
          <>
            {/* High-energy starry/blinking eyes */}
            <path d="M 12,25 L 18,21 L 12,17" stroke="#58cc02" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 38,25 L 32,21 L 38,17" stroke="#58cc02" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Glowing cute beak */}
            <path d="M 20,30 Q 25,38 30,30" fill="#ff9000" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      case "proud":
        return (
          <>
            {/* Confident, wise eyes with small virtual glasses of wisdom */}
            <path d="M 12,21 H 22 M 28,21 H 38" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="17" cy="25" r="3" fill="#3b82f6" />
            <circle cx="33" cy="25" r="3" fill="#3b82f6" />
            {/* Smart grin beak */}
            <path d="M 22,32 Q 25,32 28,30" stroke="#ff9000" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case "confused":
        return (
          <>
            {/* Skeptical/Unbalanced screen metrics */}
            <circle cx="16" cy="22" r="2.5" fill="#ef4444" />
            <circle cx="34" cy="25" r="5" fill="#ef4444" />
            {/* Squiggly data-rate mouth representing a confused chassi */}
            <path d="M 18,33 Q 22,30 25,34 T 32,32" stroke="#ff9000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "thinking":
      default:
        return (
          <>
            {/* Normal circular digital camera lens eyes */}
            <circle cx="17" cy="24" r="3.5" fill="#ffae00" />
            <circle cx="33" cy="24" r="3.5" fill="#ffae00" />
            {/* Neutral straight-line beak */}
            <line x1="21" y1="31" x2="29" y2="31" stroke="#ff9000" strokeWidth="3" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <div id="bito-mascot-container" className="flex flex-col sm:flex-row items-center gap-5 bg-white border-b-4 border-slate-200 border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:translate-y-[1px] hover:border-b-2 transition-all">
      <div className="relative flex-shrink-0">
        {/* Floating cyber-owl movement */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 relative flex items-center justify-center bg-indigo-50/50 rounded-2xl border-2 border-slate-200/85 shadow-md overflow-hidden"
        >
          {/* Cyber-Owl body drawing */}
          <svg viewBox="0 0 50 50" className="w-20 h-20">
            {/* Ambient Background Grid pattern */}
            <circle cx="25" cy="25" r="23" fill="#f1f5f9" />
            
            {/* Little Glowing Cyber-Owl ears */}
            <path d="M 8,14 Q 4,5 14,8" fill="#58cc02" stroke="#46a302" strokeWidth="1.5" />
            <path d="M 42,14 Q 46,5 36,8" fill="#58cc02" stroke="#46a302" strokeWidth="1.5" />

            {/* Futuristic Wings (Clipped to sides) */}
            <path d="M 3,25 Q 6,32 10,35" fill="none" stroke="#58cc02" strokeWidth="4" strokeLinecap="round" />
            <path d="M 47,25 Q 44,32 40,35" fill="none" stroke="#58cc02" strokeWidth="4" strokeLinecap="round" />

            {/* Glowing Antenna */}
            <motion.line
              x1="25" y1="5" x2="25" y2="10"
              stroke="#64748b" strokeWidth="2"
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle
              cx="25" cy="4" r="2.5"
              fill={expression === "excited" ? "#10b981" : expression === "confused" ? "#ef4444" : "#ffae00"}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />

            {/* Digital owl face chassi screen */}
            <rect x="7" y="11" width="36" height="29" rx="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="9" y="13" width="32" height="25" rx="12" fill="#0f172a" />
            
            {/* Reactive LCD screen face elements */}
            {renderFace()}
          </svg>
        </motion.div>
        
        {/* Dynamic mini badge status indicator */}
        <span className="absolute -bottom-1 translate-x-1/2 right-1/2 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>

      <div className="flex-1 w-full">
        <div className="relative bg-slate-50 text-slate-700 p-4 rounded-xl border border-slate-200/80">
          <div className="absolute left-1/2 -top-2 sm:left-[-6px] sm:top-1/2 sm:-translate-y-1/2 border-solid border-b-slate-100 sm:border-b-transparent sm:border-r-slate-100 border-8 border-transparent" />
          
          <div className="text-xs font-semibold text-slate-800 uppercase tracking-widest mb-1.5 font-sans flex items-center gap-1">
            <span className="text-[10px]">🦉</span> Bito Mentor:
          </div>

          <div className="text-xs sm:text-xs text-slate-650 font-medium font-sans leading-relaxed">
            {speechBubble || "Oi, eu sou o Bito! Estou muito animado para decodificar algoritmos espaciais e arrumar meus sistemas com você! Pronto para aprender brincando?"}
          </div>

          {onAskAI && (
            <div className="mt-3 flex justify-end">
              <button
                id="btn-ask-bito-ai-feedback"
                onClick={onAskAI}
                disabled={isAiLoading}
                className="text-[10px] uppercase font-bold tracking-wider px-3 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer border-b-2 active:translate-y-[1px]"
              >
                {isAiLoading ? (
                  <>
                    <span className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-emerald-200 rounded-full inline-block" />
                    Analisando lógica...
                  </>
                ) : (
                  <>
                    <span>💡</span>
                    Perguntar ao Bito AI
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
