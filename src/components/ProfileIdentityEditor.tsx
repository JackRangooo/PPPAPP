import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, RefreshCcw, Save, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import type { Language, Theme } from '../types';

type ProfileIdentityEditorProps = {
  open: boolean;
  theme: Theme;
  language: Language;
  initialDisplayName: string;
  initialNickname: string;
  initialAvatarUrl: string;
  busy: boolean;
  onClose: () => void;
  onSave: (values: { displayName: string; nickname: string; avatarUrl: string }) => Promise<void> | void;
};

const copy = {
  en: {
    title: 'Edit Profile',
    subtitle: 'Update your avatar, display name, and login nickname together.',
    displayName: 'Display Name',
    nickname: 'Login Nickname',
    upload: 'Upload Avatar',
    resetAvatar: 'Use Default Avatar',
    save: 'Save Changes',
    cancel: 'Cancel',
    invalidFile: 'Please upload an image file.',
    imageTooLarge: 'Avatar image is too large to process.',
    nicknameHint: '3-24 characters. This is also the account you use to sign in.',
  },
  zh: {
    title: '编辑资料',
    subtitle: '统一修改头像、显示名称和登录账号。',
    displayName: '显示名称',
    nickname: '登录账号',
    upload: '上传头像',
    resetAvatar: '恢复默认头像',
    save: '保存修改',
    cancel: '取消',
    invalidFile: '请上传图片文件。',
    imageTooLarge: '头像图片过大，无法处理。',
    nicknameHint: '长度 3-24 个字符，同时也是你的登录账号。',
  },
} as const;

const resizeAvatarFile = async (file: File) => {
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('Failed to load image.'));
    nextImage.src = fileDataUrl;
  });

  const maxSize = 320;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is unavailable.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
};

export default function ProfileIdentityEditor({
  open,
  theme,
  language,
  initialDisplayName,
  initialNickname,
  initialAvatarUrl,
  busy,
  onClose,
  onSave,
}: ProfileIdentityEditorProps) {
  const ui = copy[language];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [nickname, setNickname] = useState(initialNickname);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDisplayName(initialDisplayName);
    setNickname(initialNickname);
    setAvatarUrl(initialAvatarUrl);
  }, [initialAvatarUrl, initialDisplayName, initialNickname, open]);

  const handlePickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      window.alert(ui.invalidFile);
      return;
    }

    setUploading(true);
    try {
      const nextAvatarUrl = await resizeAvatarFile(file);
      setAvatarUrl(nextAvatarUrl);
    } catch (error) {
      console.error('Failed to process avatar image', error);
      window.alert(ui.imageTooLarge);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const previewName = displayName.trim() || nickname.trim() || 'Player';

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className={clsx(
              'relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border',
              theme === 'dark' ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200 shadow-2xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
              <div>
                <h2 className={clsx('text-2xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {ui.title}
                </h2>
                <p className={clsx('mt-2 text-sm leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                  {ui.subtitle}
                </p>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-zinc-500 transition-colors hover:text-emerald-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
              <div className="grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="relative mx-auto w-fit">
                    <img
                      src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(previewName)}&background=random`}
                      alt={previewName}
                      className={clsx(
                        'h-32 w-32 rounded-full object-cover object-center shadow-xl',
                        theme === 'dark' ? 'border-4 border-zinc-900' : 'border-4 border-white',
                      )}
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy || uploading}
                      className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-lg transition-colors hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy || uploading}
                      className={clsx(
                        'w-full rounded-2xl px-4 py-2.5 text-sm font-black transition-colors',
                        theme === 'dark'
                          ? 'bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                      )}
                    >
                      {ui.upload}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      disabled={busy || uploading}
                      className={clsx(
                        'w-full rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors',
                        theme === 'dark'
                          ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        {ui.resetAvatar}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className={clsx('mb-2 block text-xs font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                      {ui.displayName}
                    </span>
                    <div className={clsx('flex items-center gap-3 rounded-2xl border px-4 py-3', theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-zinc-50')}>
                      <UserRound className="h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        maxLength={40}
                        className={clsx('w-full bg-transparent text-base font-bold outline-none', theme === 'dark' ? 'text-white' : 'text-zinc-900')}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className={clsx('mb-2 block text-xs font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                      {ui.nickname}
                    </span>
                    <div className={clsx('rounded-2xl border px-4 py-3', theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-zinc-50')}>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                        maxLength={24}
                        className={clsx('w-full bg-transparent text-base font-bold outline-none', theme === 'dark' ? 'text-white' : 'text-zinc-900')}
                      />
                      <div className={clsx('mt-2 text-xs leading-5', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                        {ui.nicknameHint}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className={clsx('flex items-center justify-end gap-3 border-t px-5 py-4 sm:px-7', theme === 'dark' ? 'border-white/8' : 'border-zinc-200')}>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className={clsx(
                  'rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors',
                  theme === 'dark'
                    ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                )}
              >
                {ui.cancel}
              </button>
              <button
                type="button"
                onClick={() => void onSave({ displayName, nickname, avatarUrl })}
                disabled={busy || uploading}
                className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {ui.save}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

