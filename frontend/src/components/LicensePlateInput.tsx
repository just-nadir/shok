import { useRef, useState } from 'react';

interface LicensePlateInputProps {
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * O'zbek avtomobil raqami input komponenti
 * Format: [01] [A] [123] [EA]  →  "01A123EA"
 */
export default function LicensePlateInput({ onChange, disabled }: LicensePlateInputProps) {
  const [region, setRegion] = useState('');   // 01-99
  const [letter1, setLetter1] = useState(''); // 1 harf
  const [digits, setDigits] = useState('');   // 3 raqam
  const [letter2, setLetter2] = useState(''); // 2 harf

  const refLetter1 = useRef<HTMLInputElement>(null);
  const refDigits = useRef<HTMLInputElement>(null);
  const refLetter2 = useRef<HTMLInputElement>(null);

  const emit = (r: string, l1: string, d: string, l2: string) => {
    onChange((r + l1 + d + l2).toUpperCase());
  };

  const handleRegion = (v: string) => {
    const val = v.replace(/\D/g, '').slice(0, 2);
    setRegion(val);
    emit(val, letter1, digits, letter2);
    if (val.length === 2) refLetter1.current?.focus();
  };

  const handleLetter1 = (v: string) => {
    const val = v.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase();
    setLetter1(val);
    emit(region, val, digits, letter2);
    if (val.length === 1) refDigits.current?.focus();
  };

  const handleDigits = (v: string) => {
    const val = v.replace(/\D/g, '').slice(0, 3);
    setDigits(val);
    emit(region, letter1, val, letter2);
    if (val.length === 3) refLetter2.current?.focus();
  };

  const handleLetter2 = (v: string) => {
    const val = v.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    setLetter2(val);
    emit(region, letter1, digits, val);
  };

  const inputBase =
    'bg-transparent text-center font-bold text-gray-700 focus:outline-none uppercase tracking-widest disabled:opacity-50';

  return (
    <div className="flex items-center justify-center">
      {/* Plate container */}
      <div
        className="relative flex items-center bg-white rounded-2xl shadow-lg overflow-hidden"
        style={{ border: '3px solid #111', minWidth: 320, height: 80 }}
      >
        {/* Left bolt */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400" />

        {/* Region section */}
        <div className="flex items-center justify-center px-3 pl-5" style={{ minWidth: 64 }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="01"
            value={region}
            onChange={(e) => handleRegion(e.target.value)}
            disabled={disabled}
            className={`${inputBase} text-3xl w-12`}
            style={{ caretColor: '#f59e0b' }}
          />
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-gray-800 mx-1" />

        {/* Main section */}
        <div className="flex items-center gap-1 px-3 flex-1 justify-center">
          <input
            ref={refLetter1}
            type="text"
            placeholder="A"
            value={letter1}
            onChange={(e) => handleLetter1(e.target.value)}
            disabled={disabled}
            className={`${inputBase} text-3xl w-8`}
            style={{ caretColor: '#f59e0b' }}
          />
          <input
            ref={refDigits}
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={digits}
            onChange={(e) => handleDigits(e.target.value)}
            disabled={disabled}
            className={`${inputBase} text-3xl w-16`}
            style={{ caretColor: '#f59e0b' }}
          />
          <input
            ref={refLetter2}
            type="text"
            placeholder="EA"
            value={letter2}
            onChange={(e) => handleLetter2(e.target.value)}
            disabled={disabled}
            className={`${inputBase} text-3xl w-12`}
            style={{ caretColor: '#f59e0b' }}
          />
        </div>

        {/* UZ flag section */}
        <div className="flex flex-col items-center justify-center pr-4 gap-0.5" style={{ minWidth: 48 }}>
          {/* Uzbekistan flag stripes */}
          <div className="flex flex-col rounded overflow-hidden" style={{ width: 28, height: 18 }}>
            <div style={{ flex: 1, background: '#1EB6D4' }} />
            <div style={{ flex: '0 0 2px', background: 'white' }} />
            <div style={{ flex: 1, background: 'white' }} />
            <div style={{ flex: '0 0 2px', background: 'white' }} />
            <div style={{ flex: 1, background: '#3BB54A' }} />
          </div>
          <span className="text-xs font-bold text-blue-700 tracking-wider">UZ</span>
        </div>

        {/* Right bolt */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400" />
      </div>
    </div>
  );
}
