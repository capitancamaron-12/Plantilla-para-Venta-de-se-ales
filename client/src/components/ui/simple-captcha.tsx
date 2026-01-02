import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

// Security constants
const MAX_FAILED_ATTEMPTS = 5;
const CAPTCHA_LENGTH = 6;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const GLOBAL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes - auto reset
const LOCKOUT_DURATION_MS = 5 * 1000; // 5 seconds lockout after max attempts
const VERIFICATION_EXPIRY_MS = 1 * 60 * 1000; // 1 minute - verification expires if no login
const VERIFY_DELAY_MS = 800;

function generateChallenge() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let captcha = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    captcha += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return {
    question: captcha,
    answer: captcha,
    timestamp: Date.now()
  };
}

function drawCaptchaCanvas(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  // 1. Fondo (Background) - slightly darker for contrast with spectral lights
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);
  
  // 2. Ruido denso (Dense noise) - Adjusted for 8.62 difficulty
  for (let i = 0; i < 1720; i++) {
    const gray = Math.floor(Math.random() * 100) + 142;
    ctx.fillStyle = `rgba(${gray},${gray},${gray}, 0.53)`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }
  
  // 3. Líneas de interferencia curvas (Curved interference lines) - Adjusted count
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height
    );
    ctx.strokeStyle = `rgba(${Math.random()*100}, ${Math.random()*100}, ${Math.random()*100}, 0.32)`;
    ctx.lineWidth = Math.random() * 2 + 1;
    ctx.stroke();
  }
  
  // 4. Texto Espectral (Spectral Text)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = 32;
  const chars = text.split('');
  let x = 25;
  
  chars.forEach((char) => {
    ctx.save();
    // Moderate rotation: +/- 21 degrees
    const angle = (Math.random() * 42 - 21) * Math.PI / 180; 
    const y = Math.random() * 16 + 27; 
    
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.font = `bold italic ${fontSize}px Arial`;
    
    // Efecto Espectral (Ghosting layers) - Adjusted spread
    for(let i=0; i<4; i++) {
        ctx.fillStyle = `rgba(${Math.random()*185}, ${Math.random()*185}, ${Math.random()*185}, 0.17)`;
        // Adjusted blur spread
        ctx.fillText(char, (Math.random()-0.5)*6.5, (Math.random()-0.5)*6.5);
    }
    
    // Texto principal "difuminado" con sombra
    ctx.shadowBlur = 4.2;
    ctx.shadowColor = "rgba(0,0,0,0.52)";
    ctx.fillStyle = `rgba(${Math.floor(Math.random() * 62)}, ${Math.floor(Math.random() * 62)}, ${Math.floor(Math.random() * 62)}, 0.81)`;
    ctx.fillText(char, 0, 0);
    
    ctx.restore();
    
    x += Math.random() * 11 + 21; 
  });
  
  // 5. Distorsión Morfológica Intensa (Strong Morphological Distortion)
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const newImageData = ctx.createImageData(width, height);
  const newData = newImageData.data;
  
  // Parametros de distorsion fuertes para dificultad 8.62
  const amplitude = 6.5; 
  const frequency = 0.068;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      
      // Combinación de ondas Sin y Cos para deformación no lineal
      const xOffset = Math.sin(y * frequency) * amplitude + Math.cos(y * 0.175) * 2.8;
      const yOffset = Math.cos(x * frequency) * amplitude + Math.sin(x * 0.175) * 2.8;
      
      const newX = Math.floor(x + xOffset);
      const newY = Math.floor(y + yOffset);
      
      const destIndex = (y * width + x) * 4;
      
      if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
        const sourceIndex = (newY * width + newX) * 4;
        
        newData[destIndex] = data[sourceIndex];
        newData[destIndex + 1] = data[sourceIndex + 1];
        newData[destIndex + 2] = data[sourceIndex + 2];
        newData[destIndex + 3] = data[sourceIndex + 3];
      } else {
        // Rellenar bordes vacíos con color de fondo aproximado
         newData[destIndex] = 240;
         newData[destIndex + 1] = 240;
         newData[destIndex + 2] = 240;
         newData[destIndex + 3] = 255;
      }
    }
  }
  
  ctx.putImageData(newImageData, 0, 0);
}

const MIN_RESPONSE_TIME = 1500;

export function SimpleCaptcha({ onVerify, className }: SimpleCaptchaProps) {
  const [, setLocation] = useLocation();
  const [challenge, setChallenge] = useState(() => generateChallenge());
  const [userAnswer, setUserAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showingErrorBeforeRefresh, setShowingErrorBeforeRefresh] = useState(false);
  const [showingExpiryMessage, setShowingExpiryMessage] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [failedAttempts, setFailedAttempts] = useState<number[]>([]);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutCheckRef = useRef<NodeJS.Timeout | null>(null);
  const verificationExpiryRef = useRef<NodeJS.Timeout | null>(null);
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedAnswerRef = useRef<string>(""); // Track if we already processed this answer
  const latestAnswerRef = useRef(userAnswer);
  const lockedOutRef = useRef(isLockedOut);
  const honeypotRef = useRef(honeypot);

  // Initialize global timeout on mount
  useEffect(() => {
    if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
    if (lockoutCheckRef.current) clearInterval(lockoutCheckRef.current);
    
    // Auto-reset captcha after global timeout
    globalTimeoutRef.current = setTimeout(() => {
      refreshChallenge();
    }, GLOBAL_TIMEOUT_MS);

    return () => {
      if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
      if (lockoutCheckRef.current) clearInterval(lockoutCheckRef.current);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      drawCaptchaCanvas(canvasRef.current, challenge.question);
    }
  }, [challenge]);

  // Check lockout status and update countdown
  useEffect(() => {
    if (!isLockedOut) return;

    lockoutCheckRef.current = setInterval(() => {
      const now = Date.now();
      const localStorageKey = 'captcha_lockout_until';
      const lockoutUntil = parseInt(localStorage.getItem(localStorageKey) || '0');
      const remaining = Math.max(0, lockoutUntil - now);

      if (remaining <= 0) {
        setIsLockedOut(false);
        setLockoutTimeRemaining(0);
        localStorage.removeItem(localStorageKey);
        setFailedAttempts([]);
      } else {
        setLockoutTimeRemaining(Math.ceil(remaining / 1000));
      }
}, 5000);
}, [isLockedOut]);

  // Check if verification expires after 1 minute without login
  useEffect(() => {
    if (!isVerified) {
      if (verificationExpiryRef.current) clearTimeout(verificationExpiryRef.current);
      setShowingExpiryMessage(false);
      return;
    }

    verificationExpiryRef.current = setTimeout(() => {
      setShowingExpiryMessage(true);
      setIsVerified(false);
      setChallenge(generateChallenge());
      setUserAnswer("");
      processedAnswerRef.current = "";
      onVerify(false);
    }, VERIFICATION_EXPIRY_MS);

    return () => {
      if (verificationExpiryRef.current) clearTimeout(verificationExpiryRef.current);
    };
  }, [isVerified, onVerify]);

  const refreshChallenge = useCallback(() => {
    // Reset failed attempts when manually refreshing
    setFailedAttempts([]);
    setIsLockedOut(false);
    localStorage.removeItem('captcha_lockout_until');

    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
      verifyTimeoutRef.current = null;
    }

    if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
    globalTimeoutRef.current = setTimeout(() => {
      refreshChallenge();
    }, GLOBAL_TIMEOUT_MS);
    
    setChallenge(generateChallenge());
    setUserAnswer("");
    setIsVerified(false);
    setHasError(false);
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    latestAnswerRef.current = userAnswer;
  }, [userAnswer]);

  useEffect(() => {
    lockedOutRef.current = isLockedOut;
  }, [isLockedOut]);

  useEffect(() => {
    honeypotRef.current = honeypot;
  }, [honeypot]);

  useEffect(() => {
    if (userAnswer === "") {
      setHasError(false);
      processedAnswerRef.current = "";
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
        verifyTimeoutRef.current = null;
      }
      return;
    }
    
    if (isLockedOut) {
      return;
    }
    
    if (honeypot !== "") {
      setHasError(true);
      onVerify(false);
      return;
    }
    
    const timeTaken = Date.now() - challenge.timestamp;
    const remainingTime = Math.max(0, MIN_RESPONSE_TIME - timeTaken);
    
    // Only process when answer is complete AND we haven't processed it yet
    if (userAnswer.length === CAPTCHA_LENGTH && processedAnswerRef.current !== userAnswer) {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }

      const scheduledAnswer = userAnswer;
      const delay = Math.max(VERIFY_DELAY_MS, remainingTime);

      verifyTimeoutRef.current = setTimeout(() => {
        if (lockedOutRef.current || honeypotRef.current !== "") {
          return;
        }
        if (latestAnswerRef.current !== scheduledAnswer) {
          return;
        }
        if (processedAnswerRef.current === scheduledAnswer) {
          return;
        }

        processedAnswerRef.current = scheduledAnswer;
        const isCorrect = scheduledAnswer.trim() === challenge.answer;

        if (isCorrect) {
          if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
          setIsVerified(true);
          setHasError(false);
          setFailedAttempts([]);
          onVerify(true);
          return;
        }

        const now = Date.now();
        const recentAttempts = [...failedAttempts, now].filter(
          time => now - time < ATTEMPT_WINDOW_MS
        );

        console.log(`[Captcha] Wrong answer. Attempts: ${recentAttempts.length}/${MAX_FAILED_ATTEMPTS}`);

        setFailedAttempts(recentAttempts);
        setHasError(true);
        setShowingErrorBeforeRefresh(true);
        onVerify(false);

        if (recentAttempts.length >= MAX_FAILED_ATTEMPTS) {
          console.log(`[Captcha] Max attempts reached! Banning IP...`);
          setIsLockedOut(true);
          const lockoutUntil = now + LOCKOUT_DURATION_MS;
          localStorage.setItem('captcha_lockout_until', lockoutUntil.toString());
          setLockoutTimeRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));

          fetch('/api/captcha/lockout', { method: 'POST' })
            .then((response) => response.json())
            .then((data) => {
              console.log(`[Captcha] Ban response:`, data);
              if (data.code) {
                const params = new URLSearchParams({
                  isPermanent: data.isPermanent?.toString() || 'false',
                  bannedUntil: data.bannedUntil || '',
                });
                setLocation(`/banned/${data.code}?${params.toString()}`);
              } else {
                setLocation('/');
              }
            })
            .catch((error) => {
              console.error(`[Captcha] Ban request failed:`, error);
              setLocation('/');
            });
        } else {
          console.log(`[Captcha] Refreshing challenge in 1500ms...`);
          setTimeout(() => {
            setChallenge(generateChallenge());
            setUserAnswer("");
            setHasError(false);
            setShowingErrorBeforeRefresh(false);
            processedAnswerRef.current = "";
            onVerify(false);
          }, 1500);
        }
      }, delay);
    }
  }, [userAnswer, challenge.answer, challenge.timestamp, honeypot, onVerify, isLockedOut]);

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <canvas 
            ref={canvasRef}
            width={180}
            height={60}
            className="rounded-lg border border-border/50"
            style={{ imageRendering: 'auto' }}
          />
          <Input
            type="text"
            placeholder=""
            value={userAnswer}
            onChange={(e) => {
              const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
              setUserAnswer(cleaned.slice(0, CAPTCHA_LENGTH));
            }}
            maxLength={CAPTCHA_LENGTH}
            className={`w-32 h-11 text-center font-mono text-lg ${
              isVerified 
                ? "border-green-500 bg-green-500/10" 
                : hasError 
                  ? "border-destructive bg-destructive/10" 
                  : "bg-muted/50"
            }`}
            disabled={isVerified}
            autoComplete="off"
            data-testid="input-captcha"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={refreshChallenge}
            className="h-11 w-11 relative"
            data-testid="button-refresh-captcha"
            title={failedAttempts.length >= MAX_FAILED_ATTEMPTS ? "Reiniciar intentos" : "Refrescar Captcha"}
          >
            <RefreshCw className={`size-4 ${failedAttempts.length >= MAX_FAILED_ATTEMPTS ? "text-primary animate-pulse" : ""}`} />
          </Button>
        </div>
      </div>
      
      {/* Honeypot field - hidden from users, bots will fill it */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ 
          position: 'absolute',
          left: '-9999px',
          opacity: 0,
          height: 0,
          width: 0,
          pointerEvents: 'none'
        }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      
      {showingExpiryMessage && (
        <p className="text-xs text-destructive mt-1.5 font-semibold">
          ⏱️ Verificación expirada. Ha pasado mucho tiempo desde que se completó el captcha
        </p>
      )}
      {isVerified && !showingExpiryMessage && (
        <p className="text-xs text-green-600 mt-1.5">✓ Verificación completada</p>
      )}
      {isLockedOut && (
        <p className="text-xs text-destructive mt-1.5 font-semibold">
          🔒 Probaste muchas veces. Intenta de nuevo más tarde
        </p>
      )}
      {!isLockedOut && showingErrorBeforeRefresh && !showingExpiryMessage && (
        <p className="text-xs text-destructive mt-1.5 font-semibold">
          ✗ Te equivocaste
        </p>
      )}
    </div>
  );
}
