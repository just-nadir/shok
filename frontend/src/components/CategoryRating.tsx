type CategoryValue = 'good' | 'average' | 'bad';

interface CategoryRatingProps {
  label: string;
  value: CategoryValue | undefined;
  onChange: (v: CategoryValue) => void;
  disabled?: boolean;
}

const options: { value: CategoryValue; label: string; activeClass: string }[] = [
  { value: 'good', label: 'Yaxshi', activeClass: 'bg-yellow-400 text-black border-yellow-400' },
  { value: 'average', label: "O'rtacha", activeClass: 'bg-orange-400 text-white border-orange-400' },
  { value: 'bad', label: 'Yomon', activeClass: 'bg-red-500 text-white border-red-500' },
];

export default function CategoryRating({ label, value, onChange, disabled = false }: CategoryRatingProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2.5 px-1 sm:px-3 min-h-[44px] rounded-lg border text-xs sm:text-sm font-medium transition-colors disabled:cursor-not-allowed
              ${value === opt.value ? opt.activeClass : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-400'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
