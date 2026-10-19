import type { CharacterProps } from './palette';

export function Ren({ size = 150, className }: CharacterProps) {
    const width = size;
    const height = Math.round((size * 240) / 200);
    return (
        <div className={className} style={{ width, height }}>
      <svg width={width} height={height} viewBox="0 0 200 240" role="img" aria-label="Ren" style={{ overflow: 'visible' }}>
      <g className="twinkle" style={{ animationDelay: '-0.6s' }}><path d="M22 60 L26 72 L38 76 L26 80 L22 92 L18 80 L6 76 L18 72 Z" fill="#FF4D8D" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path></g>
      <g className="bob" style={{ animationDelay: '-0.7s' }}>
      <path d="M56 244 C54 192 68 162 100 160 C132 162 146 192 144 244 Z" fill="#3E8E5E" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M70 168 C84 178 116 178 130 168" stroke="#F2C14E" strokeWidth="6" fill="none" strokeLinecap="round"></path>
      <path d="M100 178 L100 244" stroke="#15161D" strokeWidth="2.5"></path>
      <g className="wave"><ellipse cx="150" cy="190" rx="10" ry="18" fill="#3E8E5E" stroke="#15161D" strokeWidth="3" transform="rotate(20 150 190)"></ellipse><circle cx="156" cy="170" r="9" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></circle></g>
      <path d="M56 100 C56 64 76 46 100 46 C124 46 144 64 144 100 C144 132 124 152 100 152 C76 152 56 132 56 100 Z" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></path>
      <circle cx="66" cy="128" r="1.6" fill="#C46A3A"></circle><circle cx="71" cy="132" r="1.6" fill="#C46A3A"></circle><circle cx="63" cy="134" r="1.6" fill="#C46A3A"></circle>
      <circle cx="134" cy="128" r="1.6" fill="#C46A3A"></circle><circle cx="129" cy="132" r="1.6" fill="#C46A3A"></circle><circle cx="137" cy="134" r="1.6" fill="#C46A3A"></circle>
      <g className="eyes">
      <path d="M66 104 Q79 95 93 103" stroke="#15161D" strokeWidth="4" strokeLinecap="round" fill="none"></path>
      <ellipse cx="80" cy="115" rx="9" ry="11" fill="#8A4B21" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="80" cy="117" rx="4.5" ry="5.5" fill="#15161D"></ellipse>
      <circle cx="76" cy="110" r="3.4" fill="#FFFFFF"></circle>
      <path d="M107 103 Q121 95 134 104" stroke="#15161D" strokeWidth="4" strokeLinecap="round" fill="none"></path>
      <ellipse cx="120" cy="115" rx="9" ry="11" fill="#8A4B21" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="120" cy="117" rx="4.5" ry="5.5" fill="#15161D"></ellipse>
      <circle cx="116" cy="110" r="3.4" fill="#FFFFFF"></circle>
      </g>
      <path d="M86 132 Q100 148 114 132 Z" fill="#FFFFFF" stroke="#15161D" strokeWidth="2.6" strokeLinejoin="round"></path>
      <path d="M56 74 L42 86 L58 94 Z M144 74 L158 86 L142 94 Z" fill="#E8762C" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M58 70 L144 70 L146 98 L136 84 L128 100 L118 82 L108 98 L100 80 L90 98 L80 82 L70 100 L62 86 L55 98 Z" fill="#E8762C" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M54 72 C56 42 80 30 100 30 C122 30 144 42 146 72 Z" fill="#E5484D" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M54 72 L146 72" stroke="#15161D" strokeWidth="3"></path>
      <path d="M120 62 C140 58 160 64 168 74 C150 76 134 74 124 70 Z" fill="#C8333A" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <circle cx="100" cy="30" r="4" fill="#E5484D" stroke="#15161D" strokeWidth="2.5"></circle>
      </g>
      </svg>
        </div>
    );
}

export function Sora({ size = 150, className }: CharacterProps) {
    const width = size;
    const height = Math.round((size * 240) / 200);
    return (
        <div className={className} style={{ width, height }}>
      <svg width={width} height={height} viewBox="0 0 200 240" role="img" aria-label="Sora" style={{ overflow: 'visible' }}>
      <g className="twinkle" style={{ animationDelay: '-1.1s' }}><path d="M178 40 L181 49 L190 52 L181 55 L178 64 L175 55 L166 52 L175 49 Z" fill="#A78BFA" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path></g>
      <g className="bob" style={{ animationDelay: '-1.4s' }}>
      <path d="M46 116 C38 56 70 24 100 24 C130 24 162 56 154 116 C152 136 144 146 134 150 C140 128 138 108 134 94 L66 94 C62 108 60 128 66 150 C56 146 48 136 46 116 Z" fill="#A78BFA" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M56 244 C54 192 68 162 100 160 C132 162 146 192 144 244 Z" fill="#F3E9D2" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M84 162 L100 190 L116 162 Z" fill="#FFFFFF" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path>
      <circle cx="100" cy="206" r="2.6" fill="#15161D"></circle><circle cx="100" cy="222" r="2.6" fill="#15161D"></circle>
      <path d="M56 100 C56 64 76 46 100 46 C124 46 144 64 144 100 C144 132 124 152 100 152 C76 152 56 132 56 100 Z" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></path>
      <ellipse cx="68" cy="134" rx="7" ry="3.5" fill="#FF9EB5" opacity="0.6"></ellipse>
      <ellipse cx="132" cy="134" rx="7" ry="3.5" fill="#FF9EB5" opacity="0.6"></ellipse>
      <g className="eyes">
      <ellipse cx="80" cy="117" rx="6" ry="8" fill="#6D4AFF" stroke="#15161D" strokeWidth="2"></ellipse>
      <circle cx="78" cy="114" r="2.4" fill="#FFFFFF"></circle>
      <ellipse cx="120" cy="117" rx="6" ry="8" fill="#6D4AFF" stroke="#15161D" strokeWidth="2"></ellipse>
      <circle cx="118" cy="114" r="2.4" fill="#FFFFFF"></circle>
      </g>
      <circle cx="80" cy="117" r="14" fill="#FFFFFF" fillOpacity="0.2" stroke="#15161D" strokeWidth="2.6"></circle>
      <circle cx="120" cy="117" r="14" fill="#FFFFFF" fillOpacity="0.2" stroke="#15161D" strokeWidth="2.6"></circle>
      <path d="M94 116 Q100 112 106 116" stroke="#15161D" strokeWidth="2.6" fill="none"></path>
      <path className="glint" d="M72 112 L80 104 M76 116 L86 106" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round"></path>
      <path d="M95 138 Q100 142 105 138" stroke="#15161D" strokeWidth="2.4" strokeLinecap="round" fill="none"></path>
      <path d="M54 100 C52 60 76 38 100 38 C126 38 150 60 146 100 C140 88 132 84 126 94 C120 80 110 78 104 92 C98 78 86 78 82 94 C76 84 64 86 54 100 Z" fill="#A78BFA" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M74 54 Q88 46 100 48" stroke="#D4C6FF" strokeWidth="3.5" strokeLinecap="round" fill="none"></path>
      <g transform="rotate(-30 150 96)"><rect x="140" y="92" width="30" height="7" rx="3" fill="#FFD23F" stroke="#15161D" strokeWidth="2.5"></rect><path d="M170 92 L178 95.5 L170 99 Z" fill="#15161D"></path></g>
      </g>
      </svg>
        </div>
    );
}

export function Haru({ size = 150, className }: CharacterProps) {
    const width = size;
    const height = Math.round((size * 240) / 200);
    return (
        <div className={className} style={{ width, height }}>
      <svg width={width} height={height} viewBox="0 0 200 240" role="img" aria-label="Haru" style={{ overflow: 'visible' }}>
      <g className="twinkle" style={{ animationDelay: '-0.3s' }}><path d="M24 50 L27 59 L36 62 L27 65 L24 74 L21 65 L12 62 L21 59 Z" fill="#F28C38" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path></g>
      <g className="bob" style={{ animationDelay: '-2s' }}>
      <path d="M56 244 C54 192 68 162 100 160 C132 162 146 192 144 244 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M74 206 L126 206 L122 236 L78 236 Z" fill="#E2741F" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path>
      <g className="earL"><path d="M50 62 L56 16 L86 42 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path><path d="M58 50 L61 30 L75 42 Z" fill="#FFE0C2"></path></g>
      <g className="earR"><path d="M150 62 L144 16 L114 42 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path><path d="M142 50 L139 30 L125 42 Z" fill="#FFE0C2"></path></g>
      <path d="M40 118 C34 60 66 30 100 30 C134 30 166 60 160 118 C158 150 140 168 100 170 C60 168 42 150 40 118 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M56 102 C56 66 76 48 100 48 C124 48 144 66 144 102 C144 134 124 154 100 154 C76 154 56 134 56 102 Z" fill="#FFE8DC" stroke="#15161D" strokeWidth="3"></path>
      <ellipse cx="68" cy="134" rx="8" ry="4" fill="#FF9EB5" opacity="0.75"></ellipse>
      <ellipse cx="132" cy="134" rx="8" ry="4" fill="#FF9EB5" opacity="0.75"></ellipse>
      <g className="eyes">
      <path d="M66 106 Q79 97 93 105" stroke="#15161D" strokeWidth="4" strokeLinecap="round" fill="none"></path>
      <ellipse cx="80" cy="117" rx="9" ry="11" fill="#2FA36B" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="80" cy="119" rx="4.5" ry="5.5" fill="#15161D"></ellipse>
      <circle cx="76" cy="112" r="3.4" fill="#FFFFFF"></circle>
      </g>
      <path d="M108 118 Q120 108 132 118" stroke="#15161D" strokeWidth="4.5" strokeLinecap="round" fill="none"></path>
      <path d="M92 136 Q96 141 100 136 Q104 141 108 136" stroke="#15161D" strokeWidth="2.4" strokeLinecap="round" fill="none"></path>
      <path d="M60 98 C58 68 78 52 100 52 C122 52 142 68 140 98 L132 86 L124 98 L114 84 L106 96 L98 82 L88 96 L80 84 L70 98 Z" fill="#5A3A2E" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M78 62 Q90 56 100 58" stroke="#8C6252" strokeWidth="3" strokeLinecap="round" fill="none"></path>
      </g>
      </svg>
        </div>
    );
}
