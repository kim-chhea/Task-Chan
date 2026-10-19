import { HAIR_DEFAULT, OUTFIT_DEFAULT, type Gear, type Mood } from './palette';

export interface KaiProps {
    hair?: { color: string; hi: string };
    outfit?: { color: string; trim: string };
    gear?: Gear;
    mood?: Mood;
    accent?: string;
    size?: number;
    className?: string;
}

/** Kai, the default mascot. Original code-drawn SVG. */
export default function Kai({
    hair = HAIR_DEFAULT,
    outfit = OUTFIT_DEFAULT,
    gear = 'headphones',
    mood = 'idle',
    accent = '#4F63F0',
    size = 150,
    className,
}: KaiProps) {
    const happy = mood !== 'idle';
    const width = size;
    const height = Math.round((size * 240) / 200);
    return (
        <div className={`${mood === 'cheer' ? 'cheer ' : ''}${className ?? ''}`} style={{ width, height }}>
      <svg width={width} height={height} viewBox="0 0 200 240" role="img" aria-label="Kai, the app's mascot" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="236" rx="50" ry="6" fill="#15161D" opacity="0.2"></ellipse>
      <g className="bob">
      <path d="M50 108 C40 60 66 28 100 26 C134 28 160 60 150 108 C146 120 140 128 134 130 C138 112 138 100 134 92 L66 92 C62 100 62 112 66 130 C60 128 54 120 50 108 Z" fill={hair.color} stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M56 240 C54 192 68 162 100 160 C132 162 146 192 144 240 Z" fill={outfit.color} stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M80 166 L100 184 L120 166" stroke="#15161D" strokeOpacity="0.3" strokeWidth="3" fill="none" strokeLinejoin="round"></path>
      <path d="M90 176 L88 196 M110 176 L112 196" stroke={outfit.trim} strokeWidth="3" strokeLinecap="round"></path>
      {gear === 'headphones' && (<>
      <path d="M66 168 C82 186 118 186 134 168" stroke="#FFD23F" strokeWidth="5" fill="none" strokeLinecap="round"></path>
      <ellipse cx="64" cy="166" rx="9" ry="12" fill="#FFD23F" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="136" cy="166" rx="9" ry="12" fill="#FFD23F" stroke="#15161D" strokeWidth="3"></ellipse>
      </>)}
      <path d="M56 100 C56 64 76 46 100 46 C124 46 144 64 144 100 C144 132 124 152 100 152 C76 152 56 132 56 100 Z" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></path>
      <g transform="rotate(-14 127 131)"><rect x="118" y="126" width="18" height="9" rx="3" fill="#FFF3E6" stroke="#15161D" strokeWidth="2"></rect></g>
      {happy && (<>
      <path d="M68 118 Q80 104 92 118 M108 118 Q120 104 132 118" stroke="#15161D" strokeWidth="4.5" strokeLinecap="round" fill="none"></path>
      <path d="M92 134 Q101 146 110 134 Z" fill="#E0607E" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path>
      </>)}
      {!happy && (<>
      <g className="eyes">
      <ellipse cx="80" cy="117" rx="8.5" ry="9" fill="#F2A93B" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="80" cy="119" rx="4" ry="5" fill="#15161D"></ellipse>
      <circle cx="77" cy="115" r="2.6" fill="#FFFFFF"></circle>
      <path d="M68 104 L94 104 L93 111 L68 112 Z" fill="#FFE8DC"></path>
      <path d="M66 111 L95 109" stroke="#15161D" strokeWidth="4.5" strokeLinecap="round"></path>
      <ellipse cx="120" cy="117" rx="8.5" ry="9" fill="#F2A93B" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="120" cy="119" rx="4" ry="5" fill="#15161D"></ellipse>
      <circle cx="117" cy="115" r="2.6" fill="#FFFFFF"></circle>
      <path d="M106 104 L132 104 L132 112 L107 111 Z" fill="#FFE8DC"></path>
      <path d="M105 109 L134 111" stroke="#15161D" strokeWidth="4.5" strokeLinecap="round"></path>
      </g>
      <path d="M93 138 Q102 140 109 134" stroke="#15161D" strokeWidth="2.6" strokeLinecap="round" fill="none"></path>
      </>)}
      {gear === 'glasses' && (<>
      <circle cx="80" cy="116" r="14" fill="#FFFFFF" fillOpacity="0.18" stroke="#15161D" strokeWidth="2.6"></circle>
      <circle cx="120" cy="116" r="14" fill="#FFFFFF" fillOpacity="0.18" stroke="#15161D" strokeWidth="2.6"></circle>
      <path d="M94 115 Q100 111 106 115" stroke="#15161D" strokeWidth="2.6" fill="none"></path>
      </>)}
      {gear === 'sunglasses' && (<>
      <rect x="64" y="104" width="30" height="22" rx="8" fill="#15161D" stroke="#15161D" strokeWidth="2.6"></rect>
      <rect x="106" y="104" width="30" height="22" rx="8" fill="#15161D" stroke="#15161D" strokeWidth="2.6"></rect>
      <path d="M94 112 Q100 108 106 112" stroke="#15161D" strokeWidth="3" fill="none"></path>
      <path d="M68 109 L78 109 M110 109 L120 109" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round"></path>
      </>)}
      <path d="M54 102 C50 60 76 36 102 36 C128 36 152 58 148 100 L140 86 L136 102 L124 80 L120 98 L106 76 L98 100 L88 78 L80 102 L70 84 L62 104 Z" fill={hair.color} stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M74 54 Q88 44 102 46" stroke={hair.hi} strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
      <g className="ahoge"><path d="M92 40 C86 22 98 12 108 16 C100 20 98 28 100 38 Z" fill={hair.color} stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path><path d="M108 38 C114 22 130 20 136 30 C126 28 118 32 116 42 Z" fill={hair.color} stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path></g>
      <circle cx="58" cy="128" r="4" fill="none" stroke="#FFD23F" strokeWidth="2"></circle>
      {gear === 'star' && (<>
      <path d="M134 62 L137 69 L145 70 L139 75 L141 83 L134 79 L127 83 L129 75 L123 70 L131 69 Z" fill="#FFD23F" stroke="#15161D" strokeWidth="2" strokeLinejoin="round"></path>
      </>)}
      {gear === 'cap' && (<>
      <path d="M52 74 C54 40 80 26 100 26 C122 26 146 40 148 74 Z" fill="#E5484D" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M52 74 L148 74" stroke="#15161D" strokeWidth="3"></path>
      <path d="M122 64 C142 60 162 66 170 76 C152 78 136 76 126 72 Z" fill="#C8333A" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <circle cx="100" cy="26" r="4" fill="#E5484D" stroke="#15161D" strokeWidth="2.5"></circle>
      </>)}
      {gear === 'ribbon' && (<>
      <path d="M130 56 L114 46 L116 66 Z" fill="#FF6FA3" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M130 56 L150 46 L148 68 Z" fill="#FF6FA3" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <circle cx="130" cy="56" r="6" fill="#FFB3CF" stroke="#15161D" strokeWidth="3"></circle>
      </>)}
      {gear === 'halo' && (<>
      <ellipse cx="100" cy="14" rx="30" ry="8" fill="none" stroke="#FFD23F" strokeWidth="6"></ellipse>
      <ellipse cx="100" cy="14" rx="30" ry="8" fill="none" stroke="#15161D" strokeWidth="2" opacity="0.5"></ellipse>
      </>)}
      {gear === 'crown' && (<>
      <path d="M66 40 L72 12 L88 28 L100 8 L112 28 L128 12 L134 40 Z" fill="#FFD23F" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <rect x="66" y="38" width="68" height="9" rx="3" fill="#E2B53A" stroke="#15161D" strokeWidth="3"></rect>
      <circle cx="100" cy="30" r="3.5" fill="#FF4D8D" stroke="#15161D" strokeWidth="2"></circle>
      <circle cx="80" cy="34" r="2.5" fill="#7EE0B5" stroke="#15161D" strokeWidth="1.5"></circle>
      <circle cx="120" cy="34" r="2.5" fill="#7EE0B5" stroke="#15161D" strokeWidth="1.5"></circle>
      </>)}
      {gear === 'ears' && (<>
      <path d="M58 70 C62 42 138 42 142 70" stroke="#15161D" strokeWidth="5" fill="none" strokeLinecap="round"></path>
      <path d="M64 54 L58 22 L86 42 Z" fill="#2A2B36" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M66 46 L63 30 L77 41 Z" fill="#FF9EB5"></path>
      <path d="M136 54 L142 22 L114 42 Z" fill="#2A2B36" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M134 46 L137 30 L123 41 Z" fill="#FF9EB5"></path>
      </>)}
      <g transform="rotate(-6 100 204)">
      <rect x="66" y="180" width="68" height="48" rx="9" fill="#15161D"></rect>
      <rect x="72" y="186" width="56" height="36" rx="5" fill={accent}></rect>
      <path d="M88 205 l7 7 l14 -15" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
      </g>
      <circle cx="66" cy="208" r="8" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></circle>
      <circle cx="134" cy="200" r="8" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></circle>
      </g>
      </svg>
        </div>
    );
}
