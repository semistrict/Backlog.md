import React, { useEffect, useState } from 'react';
import type { RiceInputs, RiceInputsUpdate } from '../../types';
import {
  computeRiceScore,
  formatRiceScore,
  RICE_CONFIDENCE_OPTIONS,
  RICE_IMPACT_OPTIONS,
} from '../../utils/prioritization';

const FIELD_CLASS =
  'w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200';

interface RiceInputsFieldsProps {
  rice: RiceInputs;
  disabled?: boolean;
  /** Receives each change as it is committed: a number, or null when the input is cleared. */
  onChange: (update: RiceInputsUpdate) => void;
}

/** A free-number input that commits on blur or Enter, so typing does not save half a number. */
const RiceNumberInput: React.FC<{
  label: string;
  value: number | undefined;
  min: number;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
}> = ({ label, value, min, disabled, onCommit }) => {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value]);

  const commit = () => {
    const text = draft.trim();
    const next = text === '' ? null : Number(text);
    if (next === (value ?? null)) return;
    onCommit(next);
  };

  return (
    <label className="block text-xs text-gray-600 dark:text-gray-300">
      {label}
      <input
        type="number"
        min={min}
        step="any"
        aria-label={`RICE ${label.toLowerCase()}`}
        className={`${FIELD_CLASS} mt-1`}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
      />
    </label>
  );
};

const RiceScaleSelect: React.FC<{
  label: string;
  value: number | undefined;
  scale: ReadonlyArray<{ value: number; label: string }>;
  unit?: string;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
}> = ({ label, value, scale, unit = '', disabled, onCommit }) => (
  <label className="block text-xs text-gray-600 dark:text-gray-300">
    {label}
    <select
      aria-label={`RICE ${label.toLowerCase()}`}
      className={`${FIELD_CLASS} mt-1`}
      value={value === undefined ? '' : String(value)}
      disabled={disabled}
      onChange={(event) => onCommit(event.target.value === '' ? null : Number(event.target.value))}
    >
      <option value="">None</option>
      {value !== undefined && !scale.some((step) => step.value === value) ? (
        <option value={String(value)}>
          {value}
          {unit} (not on scale)
        </option>
      ) : null}
      {scale.map((step) => (
        <option key={step.value} value={String(step.value)}>
          {step.value}
          {unit} - {step.label}
        </option>
      ))}
    </select>
  </label>
);

const RiceInputsFields: React.FC<RiceInputsFieldsProps> = ({ rice, disabled, onChange }) => {
  const score = computeRiceScore(rice);
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-900 dark:text-gray-100" aria-label="RICE score">
        Score: <span className="font-semibold">{score === undefined ? '—' : formatRiceScore(score)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <RiceNumberInput
          label="Reach"
          value={rice.reach}
          min={0}
          disabled={disabled}
          onCommit={(value) => onChange({ reach: value })}
        />
        <RiceScaleSelect
          label="Impact"
          value={rice.impact}
          scale={RICE_IMPACT_OPTIONS}
          disabled={disabled}
          onCommit={(value) => onChange({ impact: value })}
        />
        <RiceScaleSelect
          label="Confidence"
          value={rice.confidence}
          scale={RICE_CONFIDENCE_OPTIONS}
          unit="%"
          disabled={disabled}
          onCommit={(value) => onChange({ confidence: value })}
        />
        <RiceNumberInput
          label="Effort"
          value={rice.effort}
          min={0}
          disabled={disabled}
          onCommit={(value) => onChange({ effort: value })}
        />
      </div>
    </div>
  );
};

export default RiceInputsFields;
