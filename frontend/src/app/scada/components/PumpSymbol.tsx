export function PumpSymbol({ stroke, running }: { stroke: string; running: boolean }) {
  return (
    <svg viewBox="0 0 70 60" className="w-full h-full">
      <circle cx="32" cy="30" r="22" fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      <polygon points="18,20 18,40 46,30" fill={running ? stroke + '50' : '#37415180'} stroke={stroke} strokeWidth="2"/>
      <line x1="0" y1="30" x2="10" y2="30" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <line x1="54" y1="30" x2="70" y2="30" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <line x1="32" y1="52" x2="32" y2="60" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeDasharray="3,2"/>
      {running && <circle cx="32" cy="30" r="4" fill={stroke} opacity="0.8"/>}
    </svg>
  );
}
