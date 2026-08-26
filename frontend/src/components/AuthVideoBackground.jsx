import React, { useState } from 'react';
import { motion } from 'framer-motion';

const VIDEO_SRC = 'https://cdn.pixabay.com/video/2025/02/13/258089_large.mp4';

export const AuthVideoBackground = ({ children, videoEnabled = true }) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = videoEnabled && !videoFailed;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031b1d]">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.20),transparent_24%),radial-gradient(circle_at_18%_38%,rgba(15,118,110,0.34),transparent_34%),linear-gradient(135deg,#062f35_0%,#0b4b4c_45%,#021b1c_100%)]" />

      {showVideo && (
        <video
          className="fixed inset-0 z-0 h-full w-full object-cover opacity-80"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}

      {!videoEnabled && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute left-[8%] top-[12%] h-32 w-32 rounded-full bg-[#d4af37]/20 blur-3xl"
            animate={{ opacity: [0.3, 0.65, 0.3], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-[#d4af37]/60 shadow-[0_0_14px_rgba(212,175,55,0.65)]"
              style={{ left: `${10 + i * 11}%`, top: `${16 + (i % 4) * 14}%` }}
              animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -14, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 3 + i * 0.35, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          <svg viewBox="0 0 1000 360" className="absolute inset-x-0 bottom-0 w-full text-[#031d1e] opacity-90">
            <path d="M0 360V300h120v-80h70v80h120V185h70v-35h40v35h70v115h90V215h90v-55h40v55h90v145H0Z" fill="currentColor" />
            <path d="M280 300V205q0-100 110-100t110 100v95Z" fill="#052c2d" />
            <path d="M300 205q90-140 180 0Z" fill="#063738" />
            <rect x="380" y="60" width="20" height="70" rx="4" fill="#031d1e" />
            <path d="M365 61h50l-25-30Z" fill="#031d1e" />
            <rect x="130" y="120" width="30" height="180" fill="#031d1e" />
            <path d="M118 120h54l-27-34Z" fill="#031d1e" />
            <rect x="770" y="105" width="34" height="195" fill="#031d1e" />
            <path d="M756 105h62l-31-38Z" fill="#031d1e" />
            <path d="M370 300v-60q0-50 20-50t20 50v60Z" fill="#d4af37" opacity="0.55" />
          </svg>
        </div>
      )}

      <div className="fixed inset-0 z-[1] bg-[#021b1c]/40" />
      <div className="fixed inset-0 z-[1] bg-gradient-to-br from-[#063d3a]/35 via-transparent to-[#010f10]/65" />

      <motion.div
        className="fixed -left-24 top-10 z-[1] h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl"
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed -right-24 bottom-0 z-[1] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl"
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
};
