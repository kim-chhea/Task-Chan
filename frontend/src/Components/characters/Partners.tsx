import type { PartnerProps } from './palette';

export function Mochi({ size = 96, className }: PartnerProps) {
    return (
        <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Mochi the cat" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="194" rx="50" ry="6" fill="#15161D" opacity="0.14"></ellipse>
      <g className="bob">
      <g className="catTail"><path d="M136 178 C172 180 180 140 160 124" stroke="#15161D" strokeWidth="17" fill="none" strokeLinecap="round"></path><path d="M136 178 C172 180 180 140 160 124" stroke="#2A2B36" strokeWidth="11" fill="none" strokeLinecap="round"></path></g>
      <path d="M60 192 C52 150 62 114 100 112 C138 114 148 150 140 192 Z" fill="#2A2B36" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <ellipse cx="80" cy="190" rx="12" ry="7" fill="#2A2B36" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="120" cy="190" rx="12" ry="7" fill="#2A2B36" stroke="#15161D" strokeWidth="3"></ellipse>
      <path d="M60 70 L64 32 L92 58 Z" fill="#2A2B36" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M68 60 L70 44 L82 56 Z" fill="#FF9EB5"></path>
      <path d="M140 70 L136 32 L108 58 Z" fill="#2A2B36" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M132 60 L130 44 L118 56 Z" fill="#FF9EB5"></path>
      <ellipse cx="100" cy="92" rx="48" ry="40" fill="#2A2B36" stroke="#15161D" strokeWidth="3"></ellipse>
      <g className="eyes">
      <ellipse cx="80" cy="92" rx="10" ry="12" fill="#FFD23F" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="80" cy="93" rx="2.8" ry="8" fill="#15161D"></ellipse>
      <circle cx="76" cy="87" r="2.6" fill="#FFFFFF"></circle>
      <ellipse cx="120" cy="92" rx="10" ry="12" fill="#FFD23F" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="120" cy="93" rx="2.8" ry="8" fill="#15161D"></ellipse>
      <circle cx="116" cy="87" r="2.6" fill="#FFFFFF"></circle>
      </g>
      <path d="M96 106 L104 106 L100 111 Z" fill="#FF9EB5"></path>
      <path d="M92 113 Q96 117 100 112 Q104 117 108 113" stroke="#F2F2F7" strokeWidth="2" strokeLinecap="round" fill="none"></path>
      <path d="M60 104 L80 106 M60 112 L80 110 M140 104 L120 106 M140 112 L120 110" stroke="#F2F2F7" strokeWidth="1.6" strokeLinecap="round"></path>
      <path d="M68 128 Q100 142 132 128" stroke="#FF4D8D" strokeWidth="7" fill="none" strokeLinecap="round"></path>
      <circle cx="100" cy="140" r="6" fill="#FFD23F" stroke="#15161D" strokeWidth="2.5"></circle>
      </g>
      </svg>
        </div>
    );
}

export function Kon({ size = 96, className }: PartnerProps) {
    return (
        <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Kon the fox" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="194" rx="50" ry="6" fill="#15161D" opacity="0.14"></ellipse>
      <g className="bob" style={{ animationDelay: '-0.6s' }}>
      <g className="foxTail"><path d="M134 184 C178 184 190 134 164 114 C172 144 160 168 134 168 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path><path d="M164 114 C176 124 178 138 174 150 C166 142 162 128 164 114 Z" fill="#FFFFFF" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path></g>
      <path d="M62 192 C54 152 64 118 100 116 C136 118 146 152 138 192 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M84 124 C86 150 92 170 100 176 C108 170 114 150 116 124 Z" fill="#FFFFFF"></path>
      <ellipse cx="82" cy="190" rx="11" ry="7" fill="#3A2A24" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="118" cy="190" rx="11" ry="7" fill="#3A2A24" stroke="#15161D" strokeWidth="3"></ellipse>
      <g className="ear"><path d="M58 78 L56 26 L94 60 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path><path d="M64 66 L63 40 L82 58 Z" fill="#FFE0C2"></path></g>
      <g className="ear" style={{ animationDelay: '.25s' }}><path d="M142 78 L144 26 L106 60 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path><path d="M136 66 L137 40 L118 58 Z" fill="#FFE0C2"></path></g>
      <path d="M46 102 C46 72 72 56 100 56 C128 56 154 72 154 102 L144 108 C140 124 124 132 100 132 C76 132 60 124 56 108 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M70 108 C78 126 90 130 100 130 C110 130 122 126 130 108 C120 102 110 106 100 112 C90 106 80 102 70 108 Z" fill="#FFFFFF"></path>
      <g className="eyes">
      <ellipse cx="80" cy="92" rx="6.5" ry="8" fill="#15161D"></ellipse>
      <circle cx="78" cy="89" r="2.4" fill="#FFFFFF"></circle>
      <ellipse cx="120" cy="92" rx="6.5" ry="8" fill="#15161D"></ellipse>
      <circle cx="118" cy="89" r="2.4" fill="#FFFFFF"></circle>
      </g>
      <ellipse cx="100" cy="112" rx="6" ry="4.5" fill="#15161D"></ellipse>
      <path d="M94 120 Q100 125 106 120" stroke="#15161D" strokeWidth="2.2" strokeLinecap="round" fill="none"></path>
      <ellipse cx="68" cy="110" rx="6" ry="3.5" fill="#FF9EB5" opacity="0.8"></ellipse>
      <ellipse cx="132" cy="110" rx="6" ry="3.5" fill="#FF9EB5" opacity="0.8"></ellipse>
      </g>
      </svg>
        </div>
    );
}

export function Ember({ size = 96, className }: PartnerProps) {
    return (
        <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Ember the dragon" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="194" rx="50" ry="6" fill="#15161D" opacity="0.14"></ellipse>
      <g className="bob" style={{ animationDelay: '-1.2s' }}>
      <path d="M130 180 C160 184 176 168 172 150 L182 146 L174 140 C176 160 156 172 132 166 Z" fill="#5CC995" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <g className="wingL"><path d="M66 132 C36 120 22 92 34 78 C40 96 50 104 58 104 C54 94 56 86 62 80 C64 100 70 116 76 124 Z" fill="#8E7BFF" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path></g>
      <g className="wingR"><path d="M134 132 C164 120 178 92 166 78 C160 96 150 104 142 104 C146 94 144 86 138 80 C136 100 130 116 124 124 Z" fill="#8E7BFF" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path></g>
      <path d="M62 192 C54 152 64 118 100 116 C136 118 146 152 138 192 Z" fill="#7EE0B5" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M82 130 C80 156 88 178 100 182 C112 178 120 156 118 130 Z" fill="#FFF4C7" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path>
      <path d="M84 146 L116 146 M83 160 L117 160 M88 172 L112 172" stroke="#E7D79A" strokeWidth="2"></path>
      <ellipse cx="82" cy="190" rx="11" ry="7" fill="#7EE0B5" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="118" cy="190" rx="11" ry="7" fill="#7EE0B5" stroke="#15161D" strokeWidth="3"></ellipse>
      <path d="M72 64 L64 30 L88 54 Z" fill="#FFD23F" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M128 64 L136 30 L112 54 Z" fill="#FFD23F" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <ellipse cx="100" cy="92" rx="48" ry="42" fill="#7EE0B5" stroke="#15161D" strokeWidth="3"></ellipse>
      <path d="M92 50 L100 40 L108 50" fill="#5CC995" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path>
      <g className="eyes">
      <ellipse cx="80" cy="90" rx="10" ry="12" fill="#FFFFFF" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="81" cy="92" rx="6" ry="8" fill="#15161D"></ellipse>
      <circle cx="78" cy="88" r="2.6" fill="#FFFFFF"></circle>
      <ellipse cx="120" cy="90" rx="10" ry="12" fill="#FFFFFF" stroke="#15161D" strokeWidth="2"></ellipse>
      <ellipse cx="119" cy="92" rx="6" ry="8" fill="#15161D"></ellipse>
      <circle cx="116" cy="88" r="2.6" fill="#FFFFFF"></circle>
      </g>
      <ellipse cx="100" cy="114" rx="20" ry="12" fill="#A6EDCC" stroke="#15161D" strokeWidth="2.5"></ellipse>
      <circle cx="93" cy="112" r="2" fill="#15161D"></circle><circle cx="107" cy="112" r="2" fill="#15161D"></circle>
      <path d="M92 120 Q100 125 108 120" stroke="#15161D" strokeWidth="2.2" strokeLinecap="round" fill="none"></path>
      <g className="flame"><path d="M122 116 C134 106 150 108 158 116 C150 124 134 126 122 116 Z" fill="#FF8A3D" stroke="#15161D" strokeWidth="2.5" strokeLinejoin="round"></path><path d="M130 116 C138 111 146 112 150 116 C146 120 138 121 130 116 Z" fill="#FFD23F"></path></g>
      </g>
      </svg>
        </div>
    );
}

export function Pan({ size = 96, className }: PartnerProps) {
    return (
        <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Pan the red panda" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="194" rx="50" ry="6" fill="#15161D" opacity="0.14"></ellipse>
      <text className="zz" x="140" y="54" fontFamily="Dela Gothic One, Arial Black, sans-serif" fontSize="18" fill="#15161D">z</text>
      <text className="zz" x="150" y="44" fontFamily="Dela Gothic One, Arial Black, sans-serif" fontSize="13" fill="#15161D" style={{ animationDelay: '1.2s' }}>z</text>
      <g className="bob" style={{ animationDelay: '-1.8s' }}>
      <path d="M134 186 C170 188 182 156 168 134" stroke="#15161D" strokeWidth="22" fill="none" strokeLinecap="round"></path>
      <path d="M134 186 C170 188 182 156 168 134" stroke="#C8553D" strokeWidth="16" fill="none" strokeLinecap="round"></path>
      <path d="M150 186 L154 176 M164 178 L172 172 M172 164 L180 160 M174 148 L182 146" stroke="#7A2E1F" strokeWidth="5" strokeLinecap="round"></path>
      <path d="M62 192 C54 152 64 118 100 116 C136 118 146 152 138 192 Z" fill="#3A2420" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <path d="M76 124 C78 140 88 150 100 150 C112 150 122 140 124 124 Z" fill="#C8553D"></path>
      <ellipse cx="82" cy="190" rx="11" ry="7" fill="#3A2420" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="118" cy="190" rx="11" ry="7" fill="#3A2420" stroke="#15161D" strokeWidth="3"></ellipse>
      <g className="tilt">
      <circle cx="62" cy="62" r="16" fill="#C8553D" stroke="#15161D" strokeWidth="3"></circle>
      <circle cx="62" cy="62" r="8" fill="#FFFFFF"></circle>
      <circle cx="138" cy="62" r="16" fill="#C8553D" stroke="#15161D" strokeWidth="3"></circle>
      <circle cx="138" cy="62" r="8" fill="#FFFFFF"></circle>
      <ellipse cx="100" cy="94" rx="50" ry="42" fill="#C8553D" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="74" cy="78" rx="12" ry="7" fill="#FFFFFF" transform="rotate(-20 74 78)"></ellipse>
      <ellipse cx="126" cy="78" rx="12" ry="7" fill="#FFFFFF" transform="rotate(20 126 78)"></ellipse>
      <path d="M70 108 C78 126 92 130 100 130 C108 130 122 126 130 108 C118 100 108 104 100 108 C92 104 82 100 70 108 Z" fill="#FFFFFF"></path>
      <path d="M74 92 Q82 100 90 92 M110 92 Q118 100 126 92" stroke="#15161D" strokeWidth="3.6" strokeLinecap="round" fill="none"></path>
      <path d="M80 100 C78 108 82 114 86 118 M120 100 C122 108 118 114 114 118" stroke="#7A2E1F" strokeWidth="4" strokeLinecap="round" fill="none"></path>
      <ellipse cx="100" cy="112" rx="6" ry="4.5" fill="#15161D"></ellipse>
      <path d="M94 120 Q100 124 106 120" stroke="#15161D" strokeWidth="2.2" strokeLinecap="round" fill="none"></path>
      </g>
      </g>
      </svg>
        </div>
    );
}

export function Bun({ size = 96, className }: PartnerProps) {
    return (
        <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Bun the bunny" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="194" rx="50" ry="6" fill="#15161D" opacity="0.14"></ellipse>
      <g className="bob" style={{ animationDelay: '-0.3s' }}>
      <circle cx="146" cy="176" r="12" fill="#FFFFFF" stroke="#15161D" strokeWidth="3"></circle>
      <path d="M62 192 C54 152 64 118 100 116 C136 118 146 152 138 192 Z" fill="#F4F5F9" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <ellipse cx="82" cy="190" rx="12" ry="7" fill="#F4F5F9" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="118" cy="190" rx="12" ry="7" fill="#F4F5F9" stroke="#15161D" strokeWidth="3"></ellipse>
      <g className="ear"><ellipse cx="76" cy="40" rx="13" ry="34" fill="#F4F5F9" stroke="#15161D" strokeWidth="3"></ellipse><ellipse cx="76" cy="44" rx="6" ry="24" fill="#FF9EB5"></ellipse></g>
      <g className="ear" style={{ animationDelay: '.25s' }}><ellipse cx="124" cy="40" rx="13" ry="34" fill="#F4F5F9" stroke="#15161D" strokeWidth="3"></ellipse><ellipse cx="124" cy="44" rx="6" ry="24" fill="#FF9EB5"></ellipse></g>
      <ellipse cx="100" cy="98" rx="46" ry="38" fill="#F4F5F9" stroke="#15161D" strokeWidth="3"></ellipse>
      <g className="eyes">
      <ellipse cx="82" cy="96" rx="6.5" ry="8" fill="#15161D"></ellipse>
      <circle cx="80" cy="93" r="2.4" fill="#FFFFFF"></circle>
      <ellipse cx="118" cy="96" rx="6.5" ry="8" fill="#15161D"></ellipse>
      <circle cx="116" cy="93" r="2.4" fill="#FFFFFF"></circle>
      </g>
      <path d="M96 108 L104 108 L100 113 Z" fill="#FF9EB5"></path>
      <path d="M100 113 L100 118 M92 120 Q100 125 100 118 Q100 125 108 120" stroke="#15161D" strokeWidth="2.2" strokeLinecap="round" fill="none"></path>
      <ellipse cx="68" cy="112" rx="6" ry="3.5" fill="#FF9EB5" opacity="0.8"></ellipse>
      <ellipse cx="132" cy="112" rx="6" ry="3.5" fill="#FF9EB5" opacity="0.8"></ellipse>
      </g>
      </svg>
        </div>
    );
}

export function Pip({ size = 96, className }: PartnerProps) {
    return (
        <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Pip the chick" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="194" rx="46" ry="6" fill="#15161D" opacity="0.14"></ellipse>
      <g className="bob" style={{ animationDelay: '-0.9s' }}>
      <path d="M92 52 C90 36 98 28 106 30 M100 52 C102 34 112 28 120 34" stroke="#15161D" strokeWidth="3" fill="none" strokeLinecap="round"></path>
      <ellipse cx="100" cy="116" rx="66" ry="68" fill="#FFD23F" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="38" cy="124" rx="14" ry="24" transform="rotate(20 38 124)" fill="#FFC21A" stroke="#15161D" strokeWidth="3"></ellipse>
      <ellipse cx="162" cy="124" rx="14" ry="24" transform="rotate(-20 162 124)" fill="#FFC21A" stroke="#15161D" strokeWidth="3"></ellipse>
      <path d="M84 184 L80 198 M92 184 L92 198 M108 184 L108 198 M116 184 L120 198" stroke="#F28C38" strokeWidth="4" strokeLinecap="round"></path>
      <g className="eyes">
      <ellipse cx="78" cy="100" rx="7" ry="9" fill="#15161D"></ellipse>
      <circle cx="75.5" cy="96.5" r="2.6" fill="#FFFFFF"></circle>
      <ellipse cx="122" cy="100" rx="7" ry="9" fill="#15161D"></ellipse>
      <circle cx="119.5" cy="96.5" r="2.6" fill="#FFFFFF"></circle>
      </g>
      <path d="M90 116 L110 116 L100 128 Z" fill="#F28C38" stroke="#15161D" strokeWidth="3" strokeLinejoin="round"></path>
      <ellipse cx="62" cy="118" rx="8" ry="5" fill="#FF9EB5" opacity="0.8"></ellipse>
      <ellipse cx="138" cy="118" rx="8" ry="5" fill="#FF9EB5" opacity="0.8"></ellipse>
      </g>
      </svg>
        </div>
    );
}
