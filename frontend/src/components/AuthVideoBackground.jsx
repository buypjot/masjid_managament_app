import React from 'react';
import { motion } from 'framer-motion';

const VIDEO_SRC = 'https://cdn.pixabay.com/video/2025/02/13/258089_large.mp4';

export const AuthVideoBackground = ({ children, compact = false }) => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-[#062f2d]">
    <video
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    >
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-[#021b1c]/55" />
    <div className="absolute inset-0 bg-gradient-to-br from-[#063d3a]/55 via-[#021b1c]/20 to-[#010f10]/70" />
    <motion.div
      className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl"
      animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.95, 1.08, 0.95] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl"
      animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.1, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
    />
    {children}
  </div>
);
