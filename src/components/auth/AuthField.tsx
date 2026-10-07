import { forwardRef } from 'react';

// Label + input pair used by every auth form. Taller than the in-app inputs on purpose.
export const AuthField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; trailing?: React.ReactNode }
>(function AuthField({ label, trailing, id, className, ...props }, ref) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium tracking-wide text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          className={`h-12 w-full rounded-md px-4 text-sm ${trailing ? 'pr-12' : ''} ${className ?? ''}`}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>}
      </div>
    </div>
  );
});
