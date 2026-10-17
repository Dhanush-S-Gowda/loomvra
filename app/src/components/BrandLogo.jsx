import loomvraIcon from '@/assets/loomvra-icon.svg';

export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <span className={`brand-lockup ${compact ? 'brand-lockup-compact' : ''} ${className}`.trim()}>
      <img className="brand-symbol" src={loomvraIcon} alt="" aria-hidden="true" />
      <span className="brand-copy">
        <span className="brand-wordmark">loomvra</span>
        {!compact && <span className="brand-tagline">Ideas, woven into stories.</span>}
      </span>
    </span>
  );
}
