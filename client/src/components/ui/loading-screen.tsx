import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      <div className="relative flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <motion.span 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold tracking-tighter text-foreground font-['Orbitron']"
          >
            TCorp
          </motion.span>
        </div>

        <div className="h-1 w-32 bg-muted overflow-hidden rounded-full">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              repeat: Infinity, 
              duration: 1, 
              ease: "easeInOut" 
            }}
            className="h-full w-1/2 bg-primary rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
