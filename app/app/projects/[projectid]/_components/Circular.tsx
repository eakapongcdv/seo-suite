// app/app/projects/[projectid]/_components/Circular.tsx
export default function Circular({ value, label }: { value: number; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const dash = (1 - clamped / 100) * c;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <circle cx="24" cy="24" r={r} strokeWidth="6" className="fill-none stroke-gray-200" />
        <circle
          cx="24" cy="24" r={r} strokeWidth="6"
          className="fill-none stroke-indigo-600 transition-all"
          strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-gray-800">
          {clamped}%
        </text>
      </svg>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
