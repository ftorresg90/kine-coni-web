export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Eliminar' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-vino/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="bg-nude rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-rosado/20 text-center" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="w-14 h-14 bg-red-100/50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-serif text-2xl text-vino mb-2">{title}</h3>
        <p className="font-sans text-vino/70 text-sm mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={onCancel}
            className="flex-1 px-5 py-3 rounded-full bg-white/50 border border-rosado/30 text-vino font-sans font-bold text-sm hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-5 py-3 rounded-full bg-red-500 text-white font-sans font-bold text-sm hover:bg-red-600 transition-colors shadow-md"
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
