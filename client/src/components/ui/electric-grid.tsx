import { cn } from "@/lib/utils";

interface ElectricGridProps {
  className?: string;
}

export function ElectricGrid({ className }: ElectricGridProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Base Grid */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)"
        }}
      />
      
      {/* Horizontal Particles */}
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-h-1 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-h-2 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-h-3 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-h-4 opacity-0" />
      
      {/* Vertical Particles */}
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-v-1 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-v-2 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-v-3 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-v-4 opacity-0" />
      <div className="absolute w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-particle-v-5 opacity-0" />
    </div>
  );
}
