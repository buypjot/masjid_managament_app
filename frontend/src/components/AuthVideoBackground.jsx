import React, { useState } from 'react';
import { motion } from 'framer-motion';

const VIDEO_SRC = 'https://cdn.pixabay.com/video/2025/02/13/258089_large.mp4';

export const AuthVideoBackground = ({ children }) => {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031b1d]">
      {/* Always-visible cinematic fallback layer. This also prevents a black screen
          if the remote video is blocked, slow, or unavailable in the browser. */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_22%,rgba(212,175,55,0.20),transparent_24%),radial-gradient(circle_at_20%_35%,rgba(15,118,110,0.34),transparent_34%),linear-gradient(135deg,#062f35_0%,#0b4b4c_45%,#021b1c_100%)]" />

      {!videoFailed && (
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

      {/* Readability overlay while keeping the cinematic background visible. */}
      <div className="fixed inset-0 z-[1] bg-[#021b1c]/45" />
      <div className="fixed inset-0 z-[1] bg-gradient-to-br from-[#063d3a]/45 via-transparent to-[#010f10]/65" />

      {/* Subtle atmospheric glow. */}
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

      {/* Authentication pages render above the background. */}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
};
