export function TankSymbol({ stroke, level, pressure }: { stroke: string; level: number; pressure?: number }) {
  const vesselTop    = 18;
  const vesselBottom = 155;
  const vesselHeight = vesselBottom - vesselTop;
  const liquidTop    = vesselTop + vesselHeight * (1 - level / 100);

  return (
    <svg viewBox="0 0 80 180" className="w-full h-full">
      {/* Vessel Body Outline */}
      <line x1="15" y1={vesselTop + 8} x2="15" y2={vesselBottom - 8} stroke={stroke} strokeWidth="3"/>
      <line x1="65" y1={vesselTop + 8} x2="65" y2={vesselBottom - 8} stroke={stroke} strokeWidth="3"/>
      <ellipse cx="40" cy={vesselTop + 8} rx="25" ry="9" fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      <ellipse cx="40" cy={vesselBottom - 8} rx="25" ry="9" fill="#0d1117" stroke={stroke} strokeWidth="2.5"/>
      
      {/* Liquid Content */}
      <clipPath id="vesselClip"><rect x="16" y={vesselTop + 8} width="48" height={vesselHeight - 16}/></clipPath>
      <rect x="16" y={liquidTop} width="48" height={vesselBottom - liquidTop - 8} fill={stroke + '25'} clipPath="url(#vesselClip)"/>
      
      {/* Agitator Shaft & Impeller */}
      <line x1="40" y1={vesselTop + 8} x2="40" y2={vesselBottom - 14} stroke={stroke} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7"/>
      <line x1="22" y1="75" x2="58" y2="75" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="65" x2="22" y2="85" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="58" y1="65" x2="58" y2="85" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="115" x2="58" y2="115" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="105" x2="22" y2="125" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="58" y1="105" x2="58" y2="125" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>

      {/* Nozzle: Inlet 1 (Top Left, from Train 1) */}
      <line x1="0"  y1="46" x2="15" y2="46" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
      <text x="1" y="41" fontSize="6" fill="#f59e0b" fontFamily="monospace" fontWeight="bold">IN 1</text>

      {/* Nozzle: Inlet 2 (Bottom Left, from Train 2) */}
      <line x1="0"  y1="134" x2="15" y2="134" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
      <text x="1" y="129" fontSize="6" fill="#f59e0b" fontFamily="monospace" fontWeight="bold">IN 2</text>

      {/* Nozzle: Outlet (Middle Right, to Discharge Train) */}
      <line x1="65" y1="90" x2="80" y2="90" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
      <text x="56" y="85" fontSize="6" fill="#f59e0b" fontFamily="monospace" fontWeight="bold">OUT</text>

      {/* Vent line at top */}
      <line x1="52" y1="10" x2="52" y2="0" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <text x="55" y="10" fontSize="7" fill={stroke} fontFamily="monospace">V</text>

      {/* Level Gauge on right */}
      <line x1="69" y1={vesselTop + 8}     x2="77" y2={vesselTop + 8}     stroke={stroke} strokeWidth="1.5"/>
      <line x1="69" y1={vesselBottom - 8}  x2="77" y2={vesselBottom - 8}  stroke={stroke} strokeWidth="1.5"/>
      <line x1="73" y1={vesselTop + 8}     x2="73" y2={vesselBottom - 8}  stroke={stroke} strokeWidth="1" opacity="0.4"/>
      <line x1="71" y1={liquidTop}         x2="75" y2={liquidTop}         stroke={stroke} strokeWidth="2"/>
    </svg>
  );
}
