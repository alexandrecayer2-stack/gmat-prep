'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// A basic four-function calculator, matching the on-screen calculator allowed on
// the GMAT Data Insights section. Immediate-execution state machine (no eval).
export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new entry

  const current = () => parseFloat(display);

  function inputDigit(d: string) {
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
      return;
    }
    if (d === '.' && display.includes('.')) return;
    setDisplay(display.length < 15 ? display + d : display);
  }

  function compute(a: number, b: number, o: string): number {
    switch (o) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function chooseOp(nextOp: string) {
    const value = current();
    if (op !== null && !fresh && stored !== null) {
      const result = compute(stored, value, op);
      setStored(result);
      setDisplay(formatResult(result));
    } else {
      setStored(value);
    }
    setOp(nextOp);
    setFresh(true);
  }

  function equals() {
    if (op === null || stored === null) return;
    const result = compute(stored, current(), op);
    setDisplay(formatResult(result));
    setStored(null);
    setOp(null);
    setFresh(true);
  }

  function clearAll() {
    setDisplay('0');
    setStored(null);
    setOp(null);
    setFresh(true);
  }

  function backspace() {
    if (fresh) return;
    setDisplay((d) => (d.length <= 1 ? '0' : d.slice(0, -1)));
  }

  function toggleSign() {
    if (display === '0') return;
    setDisplay((d) => (d.startsWith('-') ? d.slice(1) : '-' + d));
  }

  // Physical-keyboard support. Scoped to the calculator (not window) and stops
  // propagation on handled keys so digits don't also trigger answer shortcuts.
  function handleKey(e: React.KeyboardEvent) {
    const k = e.key;
    if (k >= '0' && k <= '9') inputDigit(k);
    else if (k === '.') inputDigit('.');
    else if (k === '+') chooseOp('+');
    else if (k === '-') chooseOp('−');
    else if (k === '*') chooseOp('×');
    else if (k === '/') {
      e.preventDefault();
      chooseOp('÷');
    } else if (k === 'Enter' || k === '=') {
      e.preventDefault();
      equals();
    } else if (k === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (k === 'Escape') clearAll();
    else return; // let Tab and others bubble normally
    e.stopPropagation();
  }

  function formatResult(n: number): string {
    if (!Number.isFinite(n)) return 'Error';
    return String(Math.round(n * 1e10) / 1e10);
  }

  const Btn = ({
    label,
    ariaLabel,
    onClick,
    variant = 'num',
    wide = false,
  }: {
    label: string;
    ariaLabel?: string;
    onClick: () => void;
    variant?: 'num' | 'op' | 'fn' | 'eq';
    wide?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'h-11 rounded-md text-sm font-medium transition-colors',
        wide && 'col-span-2',
        variant === 'num' && 'bg-muted hover:bg-border text-foreground',
        variant === 'op' && 'bg-accent text-accent-foreground hover:opacity-90',
        variant === 'fn' && 'bg-muted/60 text-muted-foreground hover:bg-muted',
        variant === 'eq' && 'bg-primary text-primary-foreground hover:opacity-90',
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Calculator"
      tabIndex={0}
      onKeyDown={handleKey}
      className="w-56 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-md)]"
    >
      <div
        role="status"
        aria-live="polite"
        aria-label={`Result: ${display}`}
        className="mb-2 h-12 overflow-hidden rounded-md bg-muted px-3 text-right font-mono text-2xl leading-[3rem] tabular-nums"
      >
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <Btn label="C" ariaLabel="Clear" variant="fn" onClick={clearAll} />
        <Btn label="⌫" ariaLabel="Backspace" variant="fn" onClick={backspace} />
        <Btn label="±" ariaLabel="Toggle sign" variant="fn" onClick={toggleSign} />
        <Btn label="÷" ariaLabel="Divide" variant="op" onClick={() => chooseOp('÷')} />

        <Btn label="7" onClick={() => inputDigit('7')} />
        <Btn label="8" onClick={() => inputDigit('8')} />
        <Btn label="9" onClick={() => inputDigit('9')} />
        <Btn label="×" ariaLabel="Multiply" variant="op" onClick={() => chooseOp('×')} />

        <Btn label="4" onClick={() => inputDigit('4')} />
        <Btn label="5" onClick={() => inputDigit('5')} />
        <Btn label="6" onClick={() => inputDigit('6')} />
        <Btn label="−" ariaLabel="Subtract" variant="op" onClick={() => chooseOp('−')} />

        <Btn label="1" onClick={() => inputDigit('1')} />
        <Btn label="2" onClick={() => inputDigit('2')} />
        <Btn label="3" onClick={() => inputDigit('3')} />
        <Btn label="+" ariaLabel="Add" variant="op" onClick={() => chooseOp('+')} />

        <Btn label="0" wide onClick={() => inputDigit('0')} />
        <Btn label="." ariaLabel="Decimal point" onClick={() => inputDigit('.')} />
        <Btn label="=" ariaLabel="Equals" variant="eq" onClick={equals} />
      </div>
    </div>
  );
}
