import React, { useState } from 'react';
import { Lock, Fingerprint, Delete, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const PinLockScreen: React.FC = () => {
  const { user, unlockWithPin } = useFinance();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        const success = unlockWithPin(nextPin);
        if (!success) {
          setError(true);
          setTimeout(() => {
            setPin('');
          }, 400);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleBiometricSim = () => {
    // Biometric instant unlock
    unlockWithPin(user.pinCode || '1234');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-slate-200 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-xs flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 mb-4">
          <Lock className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">Vfinance</h1>
        <p className="text-sm text-slate-400 mt-1 mb-8 text-center">
          Digite seu PIN de 4 dígitos para acessar suas finanças
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(index => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 scale-110 animate-bounce'
                    : isFilled
                    ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                    : 'bg-[#202024]'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-4 animate-shake">
            <AlertCircle className="w-4 h-4" />
            <span>PIN incorreto. Tente novamente.</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-16 rounded-2xl bg-[#161618] hover:bg-[#202024] active:scale-95 text-2xl font-semibold transition-all border border-white/5 flex items-center justify-center text-white"
            >
              {num}
            </button>
          ))}

          {/* Biometric trigger */}
          <button
            onClick={handleBiometricSim}
            className="h-16 rounded-2xl bg-[#161618]/50 hover:bg-[#161618] active:scale-95 text-emerald-400 transition-all border border-white/5 flex flex-col items-center justify-center gap-1"
            title="Desbloquear com Biometria"
          >
            <Fingerprint className="w-6 h-6" />
            <span className="text-[9px] text-slate-400">Digital</span>
          </button>

          <button
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-[#161618] hover:bg-[#202024] active:scale-95 text-2xl font-semibold transition-all border border-white/5 flex items-center justify-center text-white"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-[#161618]/50 hover:bg-[#161618] active:scale-95 text-slate-400 hover:text-white transition-all border border-white/5 flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Dica demo: PIN padrão é <strong className="text-slate-300">1234</strong>
        </p>
      </div>
    </div>
  );
};
