export function TankSymbol({ stroke, level }: { stroke: string; level: number }) {
  const vesselTop    = 18;
  const vesselBottom = 155;
  const vesselHeight = vesselBottom - vesselTop;
  const liquidTop    = vesselTop + vesselHeight * (1 - level / 100);

  return (
    <svg viewBox="0 0 80 180" className="w-full h-full">
      <line x1="15" y1={vesselTop + 8} x2="15" y2={vesselBottom - 8} stroke={stroke} strokeWidth="3"/>
      <line x1="65" y1={vesselTop + 8} x2="65" y2={vesselBottom - 8} stroke={stroke} strokeWidth="3"/>
      <ellipse cx="40" cy={vesselTop + 8} rx="25" ry="9" fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      <ellipse cx="40" cy={vesselBottom - 8} rx="25" ry="9" fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      <clipPath id="vesselClip"><rect x="16" y={vesselTop + 8} width="48" height={vesselHeight - 16}/></clipPath>
      <rect x="16" y={liquidTop} width="48" height={vesselBottom - liquidTop - 8} fill={stroke + '25'} clipPath="url(#vesselClip)"/>
      <line x1="40" y1={vesselTop + 8} x2="40" y2={vesselBottom - 14} stroke={stroke} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7"/>
      <line x1="22" y1="75" x2="58" y2="75" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="65" x2="22" y2="85" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="58" y1="65" x2="58" y2="85" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="115" x2="58" y2="115" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="105" x2="22" y2="125" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="58" y1="105" x2="58" y2="125" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="0"  y1="35" x2="15" y2="35" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <text x="1" y="32" fontSize="7" fill={stroke} fontFamily="monospace">IN</text>
      <line x1="65" y1="145" x2="80" y2="145" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <text x="60" y="158" fontSize="7" fill={stroke} fontFamily="monospace">OUT</text>
      <line x1="52" y1="10" x2="52" y2="0" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <text x="55" y="10" fontSize="7" fill={stroke} fontFamily="monospace">V</text>
      <line x1="69" y1={vesselTop + 8}     x2="77" y2={vesselTop + 8}     stroke={stroke} strokeWidth="1.5"/>
      <line x1="69" y1={vesselBottom - 8}  x2="77" y2={vesselBottom - 8}  stroke={stroke} strokeWidth="1.5"/>
      <line x1="73" y1={vesselTop + 8}     x2="73" y2={vesselBottom - 8}  stroke={stroke} strokeWidth="1" opacity="0.4"/>
      <line x1="71" y1={liquidTop}         x2="75" y2={liquidTop}         stroke={stroke} strokeWidth="2"/>
    </svg>
  );
}
