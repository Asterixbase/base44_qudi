import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../lib/qudiTokens';

/**
 * Mobile-friendly Bottom Sheet selector.
 * Props: open, onClose, options [{value, label}], value, onChange, title
 */
export default function BottomSheet({ open, onClose, options = [], value, onChange, title }) {
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: '100%', maxWidth: 430,
              background: C.white,
              borderRadius: '20px 20px 0 0',
              zIndex: 1000,
              paddingBottom: 'env(safe-area-inset-bottom, 12px)',
              maxHeight: '75vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            {title && (
              <div style={{
                padding: '8px 16px 12px', fontWeight: 700, fontSize: 15,
                color: C.ink, borderBottom: `1px solid ${C.border}`,
              }}>{title}</div>
            )}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '14px 16px',
                    background: opt.value === value ? C.amberBg : 'transparent',
                    border: 'none', borderBottom: `1px solid ${C.border}`,
                    fontSize: 15, color: opt.value === value ? C.goldText : C.ink,
                    fontWeight: opt.value === value ? 700 : 400,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <span style={{ color: C.goldText }}>✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}