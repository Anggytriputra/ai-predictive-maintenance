export function MotorSymbol({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full">
      {/* Stator body (outer rectangle) */}
      <rect x="5" y="10" width="55" height="40" rx="3"
        fill={fill} stroke={stroke} strokeWidth="2.5"/>
      {/* Rotor circle inside */}
      <circle cx="32" cy="30" r="14"
        fill="none" stroke={stroke} strokeWidth="2"/>
      {/* Letter M — standard motor identifier */}
      <text x="32" y="35" textAnchor="middle"
        fontSize="14" fontWeight="bold" fontFamily="monospace"
        fill={stroke} stroke="none">M</text>
      {/* Shaft out to the right */}
      <line x1="60" y1="30" x2="78" y2="30"
        stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      {/* Shaft end cap */}
      <circle cx="78" cy="30" r="2" fill={stroke}/>
      {/* Terminal box on top */}
      <rect x="20" y="2" width="24" height="9" rx="2"
        fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <line x1="26" y1="2" x2="26" y2="11" stroke={stroke} strokeWidth="1"/>
      <line x1="32" y1="2" x2="32" y2="11" stroke={stroke} strokeWidth="1"/>
      <line x1="38" y1="2" x2="38" y2="11" stroke={stroke} strokeWidth="1"/>
    </svg>
  );
}
