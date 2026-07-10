'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const t = useTranslations('countdown');
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsComplete(true);
        onComplete?.();
        return null;
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      if (newTimeLeft === null) {
        clearInterval(timer);
      } else {
        setTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (isComplete || !timeLeft) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      <TimeUnit value={timeLeft.days} label={t('days')} />
      <TimeUnit value={timeLeft.hours} label={t('hours')} />
      <TimeUnit value={timeLeft.minutes} label={t('minutes')} />
      <TimeUnit value={timeLeft.seconds} label={t('seconds')} />
    </div>
  );
}

interface TimeUnitProps {
  value: number;
  label: string;
}

function TimeUnit({ value, label }: TimeUnitProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-2xl font-bold text-primary sm:h-20 sm:w-20 sm:text-3xl">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
