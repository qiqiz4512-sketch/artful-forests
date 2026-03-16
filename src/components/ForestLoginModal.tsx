import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAnimationControls } from 'framer-motion';

export type ForestAuthMode = 'register' | 'login';

interface Props {
  open: boolean;
  identifier: string;
  email: string;
  password: string;
  mode: ForestAuthMode;
  errorMessage?: string;
  errorPulse?: number;
  canSubmit?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  onIdentifierChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onSwitchMode: (mode: ForestAuthMode) => void;
  onCancel: () => void;
}

export default function ForestLoginModal({
  open,
  identifier,
  email,
  password,
  mode,
  errorMessage,
  errorPulse = 0,
  canSubmit = true,
  isSubmitting = false,
  submitLabel,
  onIdentifierChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitchMode,
  onCancel,
}: Props) {
  const shakeControls = useAnimationControls();

  useEffect(() => {
    if (!open || errorPulse <= 0) return;
    void shakeControls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.34, ease: 'easeInOut' },
    });
  }, [errorPulse, open, shakeControls]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.button
            type="button"
            className="absolute inset-0"
            aria-label="关闭登录弹窗"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              background: 'rgba(6, 12, 9, 0.45)',
              backdropFilter: 'blur(3px)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="认领你的森林通行证"
              animate={shakeControls}
              className="relative w-full max-w-[460px] px-6 py-7 sm:px-8 sm:py-8"
              style={{
                borderRadius: 24,
                background: 'rgba(20, 40, 30, 0.56)',
                border: '1px solid rgba(232, 245, 233, 0.32)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 18px 48px rgba(7, 16, 12, 0.28)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <span
                aria-hidden="true"
                className="absolute left-5 top-4"
                style={{
                  fontSize: 15,
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))',
                }}
              >
                🎐
              </span>

              <h2
                className="text-center mt-4 mb-7"
                style={{
                  fontFamily: 'var(--font-handwritten)',
                  color: 'rgba(238, 252, 241, 0.96)',
                  fontSize: 'clamp(24px, 4.4vw, 32px)',
                  letterSpacing: '0.02em',
                  textShadow: '0 3px 8px rgba(0, 0, 0, 0.26)',
                }}
              >
                认领你的森林通行证
              </h2>

              <label className="block" htmlFor="forest-login-identifier">
                <span className="sr-only">输入账号</span>
                <input
                  id="forest-login-identifier"
                  className="forest-login-input w-full"
                  autoFocus
                  type="text"
                  value={identifier}
                  maxLength={48}
                  aria-invalid={Boolean(errorMessage)}
                  placeholder={mode === 'register' ? '设置用户名' : '邮箱或用户名'}
                  onChange={(event) => onIdentifierChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSubmit();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onCancel();
                    }
                  }}
                />
              </label>

              {mode === 'register' && (
                <label className="block mt-3" htmlFor="forest-login-email">
                  <span className="sr-only">输入邮箱</span>
                  <input
                    id="forest-login-email"
                    className="forest-login-input w-full"
                    type="email"
                    value={email}
                    maxLength={120}
                    aria-invalid={Boolean(errorMessage)}
                    placeholder="输入邮箱"
                    onChange={(event) => onEmailChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onSubmit();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        onCancel();
                      }
                    }}
                  />
                </label>
              )}

              <label className="block mt-3" htmlFor="forest-login-password">
                <span className="sr-only">输入密码</span>
                <input
                  id="forest-login-password"
                  className="forest-login-input w-full"
                  type="password"
                  value={password}
                  maxLength={72}
                  aria-invalid={Boolean(errorMessage)}
                  placeholder={mode === 'register' ? '设置密码（至少 6 位）' : '输入密码'}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSubmit();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onCancel();
                    }
                  }}
                />
              </label>

              <div
                className="min-h-[22px] mt-1"
                style={{
                  color: 'rgba(196, 255, 169, 0.92)',
                  fontSize: 12,
                }}
              >
                {errorMessage || ''}
              </div>

              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="relative inline-flex w-full max-w-[250px]">
                  <motion.button
                    type="button"
                    className="forest-login-primary"
                    onClick={onSubmit}
                    disabled={!canSubmit || isSubmitting}
                    aria-disabled={!canSubmit || isSubmitting}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isSubmitting ? '提交中...' : submitLabel ?? (mode === 'register' ? '注册' : '登录')}
                  </motion.button>

                  <span
                    aria-hidden="true"
                    className="forest-login-squirrel"
                  >
                    🐿️
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  className="forest-login-switch"
                  onClick={() => onSwitchMode(mode === 'register' ? 'login' : 'register')}
                >
                  {mode === 'register' ? '已有账号，直接登录' : '没有账号，去注册'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}