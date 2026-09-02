import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Compass, Calendar, Users, MapPin, Search, User as UserIcon, LogIn } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AdventureHeroProps {
  onOpenMemberModal?: () => void;
}

export const AdventureHero: React.FC<AdventureHeroProps> = ({ onOpenMemberModal }) => {
  const { activities } = useAppContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = (activities && activities.length > 0)
    ? activities.map(act => ({
        url: act.image || (act.type === 'go_karting' ? '/gokart-night.png' : 'https://www.huntleyequestrian.com/cdn/shop/articles/Is-Horse-Riding-a-Sport-Huntley-Equestrian-110301396.jpg?crop=center&height=1200&v=1743859147&width=1200'),
        title: act.name,
        badge: act.type === 'go_karting' ? 'Top Activity' : act.type === 'horse_riding' ? 'Horse Riding' : 'Air Rifle'
      }))
    : [
        {
          url: "/gokart-night.png",
          title: "Pro Go-Karting",
          badge: "Top Activity"
        },
        {
          url: "https://www.huntleyequestrian.com/cdn/shop/articles/Is-Horse-Riding-a-Sport-Huntley-Equestrian-110301396.jpg?crop=center&height=1200&v=1743859147&width=1200",
          title: "Royal Trails",
          badge: "Horse Riding"
        },
        {
          url: "https://www.gunforglory.in/wp-content/uploads/2026/04/GFG-BLOG-FEATURE-3-1.png",
          title: "Precision Shooting",
          badge: "Air Rifle"
        }
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <div className="relative flex flex-col justify-center bg-[#050816] overflow-hidden text-[#F8FAFC] w-full font-sans selection:bg-[#14F1D9]/30 pt-4 pb-8 sm:py-8 lg:py-10">
      
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Electric blue radial glow */}
        <div className="absolute -left-[20%] top-0 w-[600px] h-[600px] bg-[#00B4FF]/10 rounded-full blur-[120px]" />
        
        {/* Teal radial glow */}
        <div className="absolute right-[10%] top-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#14F1D9]/10 rounded-full blur-[140px]" />
        
        {/* Accent glow */}
        <div className="absolute left-[40%] bottom-0 w-[500px] h-[500px] bg-[#FFB703]/5 rounded-full blur-[120px]" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e108_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e108_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Premium noise texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay"></div>

        {/* Racing motion streaks */}
        <motion.div 
          animate={{ x: ['-100%', '200%'] }} 
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1 }}
          className="absolute top-[20%] left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-[#14F1D9]/50 to-transparent"
        />
        <motion.div 
          animate={{ x: ['-100%', '200%'] }} 
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 0.5 }}
          className="absolute top-[60%] left-0 w-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#00B4FF]/40 to-transparent"
        />
      </div>

      {/* ── HERO CONTENT: COMPACT BALANCED 2-COLUMN LAYOUT ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10">
        
        {/* Left: Headline, Badge, Highlights & CTA */}
        <div className="w-full lg:w-[56%] flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
          
          {/* Animated Destination Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(20,241,217,0.15)]"
          >
            <span className="text-base">🏎️</span>
            <span className="text-[11px] sm:text-xs font-bold text-[#14F1D9] uppercase tracking-widest">
              Yelagiri Ultimate Adventure Destination
            </span>
          </motion.div>

          {/* Large Bold Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.12] tracking-tight"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] to-[#CBD5E1]">Experience </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14F1D9] to-[#00B4FF]">Speed,</span><br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB703] to-[#F59E0B]"> Adventure & Excitement</span><br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] to-[#CBD5E1]">Like Never Before</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm text-[#CBD5E1] max-w-xl leading-relaxed font-medium"
          >
            High-speed Go Karting, Royal Horse Riding, Olympic Air Rifle Shooting, ATV Dirt Adventures, Deuce Food Street and family entertainment at Yelagiri Hills.
          </motion.p>

          {/* Activity Feature Badges */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap gap-2 justify-center lg:justify-start pt-1"
          >
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-[#14F1D9] font-bold">
              🏎️ 850m Pro Track
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-amber-300 font-bold">
              🐎 Royal Horses
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-300 font-bold">
              🎯 10m Air Rifle
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-emerald-300 font-bold">
              🍔 Food Street
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pt-2 flex flex-wrap gap-3 items-center justify-center lg:justify-start"
          >
            <a
              href="#activities-section"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#14F1D9] via-[#00ABAB] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-wider hover:scale-[1.03] transition-all shadow-[0_0_20px_rgba(20,241,217,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Activities & Book</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Right Side Visual Area (Compact Slider) */}
        <div className="w-full lg:w-[44%] flex items-center justify-center perspective-1000">
          <div className="relative w-full max-w-[440px] aspect-[16/11] flex items-center justify-center">
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 0.96, rotateY: 6 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 1.04, rotateY: -6 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="absolute inset-0 z-10 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(20,241,217,0.25)] border border-[#14F1D9]/30 group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent z-10"></div>
                <img 
                  src={heroImages[currentImageIndex].url} 
                  alt={heroImages[currentImageIndex].title} 
                  className="w-full h-full object-cover object-center filter saturate-125 contrast-115 transform group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute bottom-3 left-4 z-20">
                  <span className="px-2.5 py-0.5 bg-[#14F1D9] text-[#0B1120] text-[9px] font-black uppercase tracking-widest rounded-full">
                    {heroImages[currentImageIndex].badge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5 drop-shadow-md">
                    {heroImages[currentImageIndex].title}
                  </h3>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider Indicators */}
            <div className="absolute bottom-2 z-20 flex gap-1.5">
              {heroImages.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-6 bg-[#14F1D9]' : 'w-1.5 bg-white/30'}`}
                />
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

