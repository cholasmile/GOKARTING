import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Compass, Calendar, Users, MapPin, Search, User as UserIcon, LogIn } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AdventureHeroProps {
  onOpenMemberModal?: () => void;
}

export const AdventureHero: React.FC<AdventureHeroProps> = ({ onOpenMemberModal }) => {
  const { currentUser, setCurrentUser } = useAppContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
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
    <div className="relative min-h-[100vh] flex flex-col lg:flex-row bg-[#050816] overflow-hidden text-[#F8FAFC] w-full font-sans selection:bg-[#14F1D9]/30">
      
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Electric blue radial glow */}
        <div className="absolute -left-[20%] top-0 w-[800px] h-[800px] bg-[#00B4FF]/10 rounded-full blur-[150px]" />
        
        {/* Teal radial glow */}
        <div className="absolute right-[10%] top-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#14F1D9]/10 rounded-full blur-[180px]" />
        
        {/* Accent glow */}
        <div className="absolute left-[40%] bottom-0 w-[600px] h-[600px] bg-[#FFB703]/5 rounded-full blur-[150px]" />

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
        <motion.div 
          animate={{ x: ['-100%', '200%'] }} 
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 2 }}
          className="absolute top-[85%] left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#FFB703]/30 to-transparent"
        />
      </div>


      {/* Left Side Content (60%) */}
      <div className="relative z-10 w-full lg:w-[60%] flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-20 lg:py-0">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit mb-8 shadow-[0_0_20px_rgba(20,241,217,0.15)]"
        >
          <span className="text-xl">🏎️</span>
          <span className="text-xs sm:text-sm font-bold text-[#14F1D9] uppercase tracking-widest">
            yelagiries premier adeventure Dstination
          </span>
        </motion.div>

        {/* Large Bold Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight mb-8"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] to-[#CBD5E1]">Experience</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14F1D9] to-[#00B4FF]">Speed,</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB703] to-[#F59E0B]">Adventure & Excitement</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] to-[#CBD5E1]">Like Never Before</span>
        </motion.h1>

        {/* Supporting Text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg sm:text-xl text-[#CBD5E1] max-w-2xl mb-8 leading-relaxed font-medium"
        >
          Experience high-speed Go Karting, Horse Riding, Air Rifle Shooting, ATV Adventures, Food Street and Family Entertainment from one destination.
        </motion.p>

        {/* Member & Guest Access Bar in Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="bg-[#050816]/80 border border-[#14F1D9]/30 rounded-2xl p-4 max-w-xl shadow-[0_0_30px_rgba(20,241,217,0.15)] backdrop-blur-xl"
        >
          {currentUser ? (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black flex items-center justify-center text-base">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'M'}
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">{currentUser.name}</span>
                  <span className="text-[10px] text-[#14F1D9] font-mono font-bold uppercase">Verified Member • {currentUser.email}</span>
                </div>
              </div>
              <button
                onClick={() => setCurrentUser(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold font-mono transition-all border border-rose-500/30"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#14F1D9]">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Guest Mode Active</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">Instant Booking</span>
                  </div>
                  <span className="text-xs text-[#9CA3AF]">Book directly as guest or sign in to sync tickets</span>
                </div>
              </div>

              <button
                onClick={onOpenMemberModal}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-wider hover:scale-[1.02] transition-all cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)] flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> Member Login / Sign Up
              </button>
            </div>
          )}
        </motion.div>

      </div>

      {/* Right Side Visual Area (45%) */}
      <div className="relative z-10 w-full lg:w-[40%] min-h-[70vh] lg:min-h-full flex items-center justify-center p-6 sm:p-12 lg:p-8 perspective-1000">
        
        {/* Image Slider Container */}
        <div className="relative w-full max-w-[500px] xl:max-w-[600px] aspect-square sm:aspect-[4/5] lg:aspect-square flex items-center justify-center">
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 1.05, rotateY: -10 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 sm:inset-4 z-10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(20,241,217,0.3)] border border-[#14F1D9]/30 group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent z-10"></div>
              <img 
                src={heroImages[currentImageIndex].url} 
                alt={heroImages[currentImageIndex].title}
                className="w-full h-full object-cover object-center filter saturate-150 contrast-125 transform group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="px-3 py-1 bg-[#14F1D9] text-[#0B1120] text-[10px] font-black uppercase tracking-widest rounded-full">
                  {heroImages[currentImageIndex].badge}
                </span>
                <h3 className="text-3xl font-black text-white mt-2 drop-shadow-lg">
                  {heroImages[currentImageIndex].title}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slider Indicators */}
          <div className="absolute bottom-4 z-20 flex gap-2">
            {heroImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-8 bg-[#14F1D9]' : 'w-2 bg-white/30'}`}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
