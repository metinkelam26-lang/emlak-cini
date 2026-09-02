import { useEffect, useState } from 'react';

type MoneyInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

function parseMoney(value: string) {
  const lowered = value.toLocaleLowerCase('tr-TR').trim();
  const multiplier = /(milyar|mr)\s*$/.test(lowered)
    ? 1_000_000_000
    : /(milyon|mn|m)\s*$/.test(lowered)
      ? 1_000_000
      : 1;
  const cleaned = lowered.replace(/[^0-9.,]/g, '');
  if (!cleaned) return 0;

  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const tail = lastSeparator === -1 ? '' : cleaned.slice(lastSeparator + 1);
  const normalized = /^\d{1,2}$/.test(tail)
    ? `${cleaned.slice(0, lastSeparator).replace(/[.,]/g, '')}.${tail}`
    : cleaned.replace(/[.,]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : 0;
}

function formatMoney(value: number) {
  return value > 0 ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) : '';
}

export default function MoneyInput({
  value,
  onValueChange,
  placeholder,
  className,
  ariaLabel,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(() => formatMoney(value));

  useEffect(() => {
    if (!focused) setDisplay(formatMoney(value));
  }, [focused, value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => {
        setFocused(true);
        setDisplay(value > 0 ? String(value) : '');
      }}
      onChange={(event) => {
        setDisplay(event.target.value);
        onValueChange(parseMoney(event.target.value));
      }}
      onBlur={() => {
        const parsed = parseMoney(display);
        onValueChange(parsed);
        setFocused(false);
        setDisplay(formatMoney(parsed));
      }}
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
}
