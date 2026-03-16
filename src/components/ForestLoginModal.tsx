import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAnimationControls } from 'framer-motion';

interface Props {
  open: boolean;
  errorMessage?: string;
  errorPulse?: number;
  ssoLabel?: string;
  ssoSubmitting?: boolean;
  ssoDisabled?: boolean;
  onSsoSubmit: () => void;
  onCancel: () => void;
  forceAuth?: boolean;
}

export default function ForestLoginModal({
  open,
  errorMessage,
  errorPulse = 0,
  ssoLabel = '使用 SecondMe 单点登录',
  ssoSubmitting = false,
  ssoDisabled = false,
  onSsoSubmit,
  onCancel,
  forceAuth = false,
}: Props) {
  const shakeControls = useAnimationControls();

  useEffect(() => {
    if (!open || errorPulse <= 0) return;
    void shakeControls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.34, ease: 'easeInOut' },
    });
  }, [errorPulse, open, shakeControls]);

  useEffect(() => {
    if (!open || forceAuth) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCancel();
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [forceAuth, onCancel, open]);

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
            onClick={() => {
              if (!forceAuth) onCancel();
            }}
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

              <div
                className="min-h-[22px] mt-1 mb-5"
                style={{
                  color: 'rgba(196, 255, 169, 0.92)',
                  fontSize: 12,
                }}
              >
                {errorMessage || ''}
              </div>

              <div className="mt-5 flex items-center justify-center">
                <div className="relative inline-flex w-full max-w-[250px]">
                  <motion.button
                    type="button"
                    className="forest-login-switch"
                    onClick={onSsoSubmit}
                    disabled={ssoSubmitting || ssoDisabled}
                    aria-disabled={ssoSubmitting || ssoDisabled}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%',
                      maxWidth: 250,
                      borderRadius: 999,
                      border: '1px solid rgba(215, 239, 206, 0.35)',
                      padding: '10px 16px',
                      color: ssoDisabled ? 'rgba(200, 212, 202, 0.72)' : 'rgba(228, 246, 231, 0.92)',
                      background: ssoDisabled ? 'rgba(28, 62, 46, 0.22)' : 'rgba(28, 62, 46, 0.36)',
                      cursor: ssoDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {ssoSubmitting ? '跳转中...' : ssoLabel}
                  </motion.button>

                  <span
                    aria-hidden="true"
                    className="forest-login-squirrel"
                  >
                    🐿️
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}