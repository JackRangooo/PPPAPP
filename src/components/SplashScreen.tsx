import { motion } from 'motion/react';
import clsx from 'clsx';

import Logo from './Logo';
import type { Theme } from '../types';

export default function SplashScreen({ theme = 'dark' }: { theme?: Theme }) {
  return (
    <div
      className={clsx(
        'min-h-screen relative overflow-hidden flex items-center justify-center px-6',
        theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900',
      )}
    >
      <div
        className={clsx(
          'absolute inset-0',
          theme === 'dark'
            ? 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.14),_transparent_38%)]'
            : 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.12),_transparent_35%)]',
        )}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.15, 0.35] }}
            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="absolute inset-[-24px] rounded-[2rem] border border-emerald-500/30"
          />
          <motion.div
            animate={{ rotate: [0, 6, 0, -6, 0] }}
            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className={clsx(
              'relative w-28 h-28 rounded-[2rem] flex items-center justify-center border shadow-[0_0_50px_rgba(16,185,129,0.18)]',
              theme === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-white border-emerald-200',
            )}
          >
            <Logo className="w-16 h-16 text-emerald-500" />
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="text-4xl font-black tracking-tight"
        >
          PingProPrivate
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.45 }}
          className={clsx('mt-3 text-sm font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}
        >
          Ready your next match.
        </motion.p>
      </motion.div>
    </div>
  );
}
