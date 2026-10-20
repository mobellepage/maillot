// Inline SVG icons. Decorative by default (aria-hidden); give the parent
// control an accessible name instead.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false, ...rest });

export function SearchIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function HeartIcon({ size = 16, filled = false, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size, rest)} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.7 3.3 4.3 6.7-1.9 4.7-9.4 9.3-9.4 9.3z" />
    </svg>
  );
}

export function StarIcon({ size = 16, filled = false, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size, rest)} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
    </svg>
  );
}

export function BookmarkIcon({ size = 16, filled = false, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size, rest)} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
    </svg>
  );
}

export function BellIcon({ size = 17, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export function ChatIcon({ size = 17, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1121 12z" />
    </svg>
  );
}

export function CloseIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

// Bottom navigation.
export function CompassIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

export function ShirtIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round">
      <path d="M8.5 3.5L3 6.5l2.2 4.3L7 10v10.5h10V10l1.8.8L21 6.5l-5.5-3c-.6 1.5-2 2.4-3.5 2.4s-2.9-.9-3.5-2.4z" />
    </svg>
  );
}

export function PlayCardIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round">
      <rect x="4.5" y="2.5" width="15" height="19" rx="3.5" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

export function BagIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
      <path d="M5 8h14l-1.2 12.5H6.2z" />
      <path d="M9 10.5V6.5a3 3 0 016 0v4" />
    </svg>
  );
}

export function TagIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round">
      <path d="M3 12.2V4a1 1 0 011-1h8.2l9 9a1.4 1.4 0 010 2l-7.2 7.2a1.4 1.4 0 01-2 0z" />
      <circle cx="7.8" cy="7.8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function GridIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

export function ListIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.8" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MoonIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

export function SunIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
