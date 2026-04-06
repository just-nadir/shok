import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export default function StarRating({ value, onChange, disabled = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const active = hovered > 0 ? hovered : value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} yulduz`}
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center disabled:cursor-not-allowed focus:outline-none"
        >
          <span className={star <= active ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}
