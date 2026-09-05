export function ValveSymbol({ stroke, isOpen }: { stroke: string; isOpen: boolean }) {
  const fill = isOpen ? stroke + '30' : '#37415180';
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <rect x="15" y="2" width="30" height="20" rx="2" fill="#0d1117" stroke={stroke} strokeWidth="2"/>
      <line x1="20" y1="9" x2="40" y2="9"   stroke={stroke} strokeWidth="1"/>
      <line x1="20" y1="15" x2="40" y2="15" stroke={stroke} strokeWidth="1"/>
      <line x1="30" y1="22" x2="30" y2="34" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <polygon points="2,38 28,30 28,46" fill={fill} stroke={stroke} strokeWidth="2.5"/>
      <polygon points="58,38 32,30 32,46" fill={fill} stroke={stroke} strokeWidth="2.5"/>
      <circle cx="30" cy="38" r="3" fill={stroke}/>
      <line x1="0"  y1="38" x2="2"  y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <line x1="58" y1="38" x2="60" y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <text x="30" y="72" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill={stroke}>{isOpen ? 'OPEN' : 'CLOSED'}</text>
    </svg>
  );
}
