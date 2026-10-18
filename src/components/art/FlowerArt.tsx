// Hoa 3D dựng bằng SVG nhiều lớp cánh (dự phòng hoàn hảo, không phụ thuộc WebGL).
import { useId } from "react";

type FlowerProps = { className?: string; bloomKey?: number };

const OUTER = [0, 45, 90, 135, 180, 225, 270, 315];
const MIDDLE = [22, 74, 126, 178, 230, 282, 334];
const INNER = [10, 82, 154, 226, 298, 350];

export function Rose({ className = "", bloomKey = 0 }: FlowerProps) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <div className={`rose-scene ${className}`} aria-hidden="true">
      <span className="rose-glow" />
      <span className="rose-bloom-key" key={bloomKey} />
      <svg className="rose-svg" viewBox="0 0 400 470" role="presentation">
        <defs>
          <linearGradient id={`${uid}-p1`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F7A8C4" />
            <stop offset="48%" stopColor="#FFD9E6" />
            <stop offset="100%" stopColor="#FFF5F7" />
          </linearGradient>
          <linearGradient id={`${uid}-p2`} x1="0" y1="1" x2="0.7" y2="0">
            <stop offset="0%" stopColor="#F58FB4" />
            <stop offset="55%" stopColor="#FFC8DC" />
            <stop offset="100%" stopColor="#FFEFF4" />
          </linearGradient>
          <linearGradient id={`${uid}-p3`} x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0%" stopColor="#E97AA5" />
            <stop offset="52%" stopColor="#FFB7CE" />
            <stop offset="100%" stopColor="#FFF0F4" />
          </linearGradient>
          <linearGradient id={`${uid}-leaf`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#5E9A7C" />
            <stop offset="100%" stopColor="#B8E0C8" />
          </linearGradient>
          <linearGradient id={`${uid}-stem`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#79AE8C" />
            <stop offset="100%" stopColor="#3F7C5D" />
          </linearGradient>
          <radialGradient id={`${uid}-core`}>
            <stop offset="0%" stopColor="#FFE3A3" />
            <stop offset="55%" stopColor="#F6B6A0" />
            <stop offset="100%" stopColor="#E9829F" />
          </radialGradient>
          <filter id={`${uid}-soft`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <g className="rose-leaves">
          <path d="M200 452 C 196 400 198 345 202 296" stroke={`url(#${uid}-stem)`} strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M200 420 C 160 406 132 378 122 344 C 162 340 194 366 200 400Z" fill={`url(#${uid}-leaf)`} opacity="0.95" />
          <path d="M201 374 C 238 360 268 332 278 300 C 240 296 208 320 201 354Z" fill={`url(#${uid}-leaf)`} opacity="0.9" />
          <path d="M199 336 C 172 326 154 308 148 288 C 174 286 194 304 199 320Z" fill={`url(#${uid}-leaf)`} opacity="0.65" />
        </g>

        <ellipse cx="200" cy="445" rx="84" ry="14" fill="#8F4A63" opacity="0.16" />

        <g className="rose-head">
          <g>
            {OUTER.map((angle, i) => (
              <g key={`o${angle}`} transform={`rotate(${angle} 200 202)`}>
                <path
                  className="petal petal--outer"
                  style={{ ["--i" as string]: i, ["--ring" as string]: 0 }}
                  d="M200 204 C 152 176 132 108 168 62 C 190 36 212 40 232 64 C 266 112 246 178 200 204Z"
                  fill={`url(#${uid}-p1)`}
                  stroke="#FFFFFF"
                  strokeOpacity="0.55"
                  strokeWidth="1.2"
                />
              </g>
            ))}
          </g>
          <g>
            {MIDDLE.map((angle, i) => (
              <g key={`m${angle}`} transform={`rotate(${angle + 14} 200 202)`}>
                <path
                  className="petal petal--mid"
                  style={{ ["--i" as string]: i, ["--ring" as string]: 1 }}
                  d="M200 205 C 164 181 150 130 178 94 C 196 72 214 74 230 96 C 256 134 238 180 200 205Z"
                  fill={`url(#${uid}-p2)`}
                  stroke="#FFFFFF"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                />
              </g>
            ))}
          </g>
          <g>
            {INNER.map((angle, i) => (
              <g key={`i${angle}`} transform={`rotate(${angle - 8} 200 202)`}>
                <path
                  className="petal petal--inner"
                  style={{ ["--i" as string]: i, ["--ring" as string]: 2 }}
                  d="M200 205 C 178 188 168 154 186 128 C 198 112 213 116 222 132 C 238 158 224 188 200 205Z"
                  fill={`url(#${uid}-p3)`}
                  stroke="#FFFFFF"
                  strokeOpacity="0.45"
                  strokeWidth="0.9"
                />
              </g>
            ))}
          </g>
          <circle cx="200" cy="196" r="30" fill={`url(#${uid}-core)`} opacity="0.9" />
          <path d="M186 198 C 186 182 200 174 212 182 C 224 190 220 206 206 208 C 194 210 188 202 194 196 C 200 190 208 193 207 200" stroke="#B45C7C" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
          <ellipse cx="176" cy="154" rx="22" ry="10" fill="#FFFFFF" opacity="0.35" filter={`url(#${uid}-soft)`} />
          <circle cx="238" cy="142" r="7" fill="#FFF7E0" opacity="0.8" />
        </g>
      </svg>
      <span className="rose-spark rose-spark--1">✦</span>
      <span className="rose-spark rose-spark--2">✧</span>
      <span className="rose-spark rose-spark--3">✦</span>
    </div>
  );
}

export function MiniFlower({
  variant = "daisy",
  className = "",
}: {
  variant?: "daisy" | "tulip" | "sunflower" | "bud";
  className?: string;
}) {
  if (variant === "tulip") {
    return (
      <svg className={`mini-flower ${className}`} viewBox="0 0 100 130" aria-hidden="true">
        <path d="M50 120 C 48 92 50 74 50 58" stroke="#6D9E7E" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M50 98 C 32 98 22 88 18 74 C 36 72 48 82 50 92Z" fill="#9ACFAE" />
        <path d="M48 78 C 34 56 34 32 50 20 C 66 32 66 56 48 78Z" fill="#FF9DBB" />
        <path d="M50 74 C 40 54 42 34 50 24 C 58 36 60 56 50 74Z" fill="#FFD3E0" opacity="0.8" />
        <path d="M34 44 C 34 26 42 20 50 20 C 44 30 42 44 42 58 C 38 54 34 50 34 44Z" fill="#F27FA5" />
        <path d="M62 42 C 66 28 60 20 50 20 C 58 30 58 46 58 58 C 60 52 62 46 62 42Z" fill="#F58DAF" />
      </svg>
    );
  }
  if (variant === "sunflower") {
    const petals = Array.from({ length: 14 }, (_, i) => i * (360 / 14));
    return (
      <svg className={`mini-flower ${className}`} viewBox="0 0 120 150" aria-hidden="true">
        <path d="M60 146 C 58 118 60 100 60 84" stroke="#6D9E7E" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M59 126 C 44 126 30 116 26 102 C 44 100 56 110 59 120Z" fill="#9ACFAE" />
        {petals.map((angle) => (
          <ellipse key={angle} cx="60" cy="26" rx="10" ry="25" fill="#FFC95C" transform={`rotate(${angle} 60 62)`} opacity="0.96" />
        ))}
        <circle cx="60" cy="62" r="23" fill="#8B5A3C" />
        <circle cx="60" cy="62" r="15" fill="#A9714C" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <circle key={angle} cx={60 + Math.cos((angle * Math.PI) / 180) * 9} cy={62 + Math.sin((angle * Math.PI) / 180) * 9} r="1.9" fill="#5E3B26" />
        ))}
      </svg>
    );
  }
  if (variant === "bud") {
    return (
      <svg className={`mini-flower ${className}`} viewBox="0 0 90 120" aria-hidden="true">
        <path d="M44 116 C 44 92 46 76 46 62" stroke="#6D9E7E" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M46 100 C 30 98 20 88 18 74 C 36 74 44 84 46 92Z" fill="#A9D8BC" />
        <path d="M45 64 C 22 54 24 24 45 16 C 66 24 68 54 45 64Z" fill="#F58FB0" />
        <path d="M45 58 C 32 46 34 28 45 22 C 56 30 58 48 45 58Z" fill="#FFC8D9" />
        <path d="M40 34 C 42 28 54 28 56 40 C 50 44 44 44 40 40Z" fill="#FFF1F5" opacity="0.7" />
      </svg>
    );
  }
  const petals = Array.from({ length: 10 }, (_, i) => i * 36);
  return (
    <svg className={`mini-flower ${className}`} viewBox="0 0 110 135" aria-hidden="true">
      <path d="M55 130 C 55 106 57 92 57 78" stroke="#6D9E7E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M56 112 C 40 112 28 102 24 90 C 42 88 52 98 56 104Z" fill="#A9D8BC" />
      {petals.map((angle) => (
        <ellipse key={angle} cx="55" cy="34" rx="9.5" ry="22" fill="#FFFDF8" stroke="#F8DDE6" strokeWidth="0.8" transform={`rotate(${angle} 55 60)`} />
      ))}
      <circle cx="55" cy="60" r="14" fill="#FFD36E" />
      <circle cx="55" cy="60" r="8" fill="#FFE7A6" />
      <circle cx="51" cy="57" r="1.8" fill="#F0A93C" />
      <circle cx="59" cy="62" r="1.6" fill="#F0A93C" />
    </svg>
  );
}

export function Teddy({ className = "" }: { className?: string }) {
  // Gấu chibi: đầu to, tai tròn, má hồng, mắt long lanh biết chớp, nơ cổ và cành tulip trên tay.
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg className={`teddy ${className}`} viewBox="0 0 200 220" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-fur`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#F3D2AE" />
          <stop offset="45%" stopColor="#E2B489" />
          <stop offset="100%" stopColor="#C08C63" />
        </linearGradient>
        <radialGradient id={`${uid}-head`} cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#F8DFC0" />
          <stop offset="58%" stopColor="#E8BE94" />
          <stop offset="100%" stopColor="#CE9A6E" />
        </radialGradient>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#EBC49B" />
          <stop offset="100%" stopColor="#C58F66" />
        </linearGradient>
        <radialGradient id={`${uid}-muzzle`}>
          <stop offset="0%" stopColor="#FFF8EC" />
          <stop offset="100%" stopColor="#F3DDC0" />
        </radialGradient>
        <linearGradient id={`${uid}-bow`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFAEC8" />
          <stop offset="55%" stopColor="#F07AA1" />
          <stop offset="100%" stopColor="#D9557F" />
        </linearGradient>
        <linearGradient id={`${uid}-petal`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#FFE0EA" />
          <stop offset="55%" stopColor="#FF9FBC" />
          <stop offset="100%" stopColor="#EE6E97" />
        </linearGradient>
      </defs>

      <ellipse cx="101" cy="212" rx="56" ry="8" fill="#7E3B54" opacity="0.18" />

      <g className="teddy-body">
        {/* chân */}
        <ellipse cx="70" cy="190" rx="20" ry="14" fill={`url(#${uid}-body)`} />
        <ellipse cx="132" cy="190" rx="20" ry="14" fill={`url(#${uid}-body)`} />
        <ellipse cx="68" cy="193" rx="10" ry="7" fill="#F6DFC2" opacity="0.9" />
        <ellipse cx="134" cy="193" rx="10" ry="7" fill="#F6DFC2" opacity="0.9" />

        {/* thân */}
        <ellipse cx="101" cy="158" rx="45" ry="43" fill={`url(#${uid}-body)`} />
        <ellipse cx="101" cy="164" rx="29" ry="30" fill="#F9E7CE" opacity="0.9" />

        {/* tay trái ôm hoa */}
        <ellipse cx="61" cy="150" rx="14" ry="23" fill={`url(#${uid}-fur)`} transform="rotate(24 61 150)" />
        <ellipse cx="54" cy="135" rx="10" ry="9" fill="#EDC69D" />
        {/* tay phải vẫy */}
        <g className="teddy-arm teddy-arm--wave">
          <ellipse cx="147" cy="138" rx="14" ry="24" fill={`url(#${uid}-fur)`} transform="rotate(-26 147 138)" />
          <ellipse cx="159" cy="119" rx="11" ry="10" fill="#EDC69D" />
          <ellipse cx="156" cy="120" rx="4.2" ry="3.4" fill="#D48F76" opacity="0.75" />
          <ellipse cx="162" cy="116" rx="2.4" ry="2" fill="#D48F76" opacity="0.7" />
        </g>

        {/* tai */}
        <circle cx="57" cy="60" r="23" fill={`url(#${uid}-fur)`} />
        <circle cx="57" cy="60" r="12.5" fill="#F4B9C6" />
        <circle cx="143" cy="60" r="23" fill={`url(#${uid}-fur)`} />
        <circle cx="143" cy="60" r="12.5" fill="#F4B9C6" />

        {/* đầu */}
        <ellipse cx="101" cy="86" rx="53" ry="47" fill={`url(#${uid}-head)`} />
        <ellipse cx="101" cy="72" rx="34" ry="19" fill="#FFF2E2" opacity="0.28" />
        <ellipse cx="101" cy="103" rx="26" ry="20" fill={`url(#${uid}-muzzle)`} />

        {/* mắt long lanh, chớp nhẹ */}
        <g className="teddy-eyes">
          <ellipse cx="81" cy="81" rx="7" ry="8.2" fill="#4A2532" />
          <ellipse cx="121" cy="81" rx="7" ry="8.2" fill="#4A2532" />
          <circle cx="83.4" cy="78" r="2.6" fill="#FFFFFF" />
          <circle cx="123.4" cy="78" r="2.6" fill="#FFFFFF" />
          <circle cx="79" cy="85" r="1.3" fill="#F7CFE0" opacity="0.85" />
          <circle cx="119" cy="85" r="1.3" fill="#F7CFE0" opacity="0.85" />
        </g>

        {/* mũi + miệng + má */}
        <ellipse cx="101" cy="98" rx="7" ry="5.2" fill="#5C3341" />
        <ellipse cx="98.6" cy="96.2" rx="2.2" ry="1.4" fill="#FFFFFF" opacity="0.55" />
        <path d="M101 103 V107 M101 107 C 96 113 90 109 89 105 M101 107 C 106 113 112 109 113 105" stroke="#6B3A4A" strokeWidth="2.3" fill="none" strokeLinecap="round" />
        <ellipse cx="69" cy="97" rx="9.5" ry="5.2" fill="#F6A8B9" opacity="0.62" />
        <ellipse cx="133" cy="97" rx="9.5" ry="5.2" fill="#F6A8B9" opacity="0.62" />

        {/* nơ cổ */}
        <g className="teddy-bow">
          <path d="M100 111 C 88 101 74 103 77 113 C 80 123 94 119 100 114Z" fill={`url(#${uid}-bow)`} />
          <path d="M102 111 C 114 101 128 103 125 113 C 122 123 108 119 102 114Z" fill={`url(#${uid}-bow)`} />
          <circle cx="101" cy="113" r="6.6" fill="#E8638B" />
          <circle cx="99" cy="111" r="2" fill="#FFD9E5" opacity="0.7" />
        </g>

        {/* cành tulip trên tay, vẽ sau cùng để luôn nổi bật */}
        <g className="teddy-flower">
          <path d="M58 141 C 48 128 42 116 40 104" stroke="#7FB08F" strokeWidth="3.6" fill="none" strokeLinecap="round" />
          <path d="M49 126 C 38 124 31 117 29 108 C 39 107 47 114 49 123Z" fill="#A8D6B9" />
          <path d="M41 96 C 25 84 25 62 41 52 C 57 62 57 84 41 96Z" fill={`url(#${uid}-petal)`} />
          <path d="M41 88 C 31 74 32 60 41 55 C 50 62 52 76 41 88Z" fill="#FFD9E6" opacity="0.9" />
          <path d="M41 54 C 31 62 26 74 27 85 C 34 82 40 72 41 62Z" fill="#F58AAC" />
          <ellipse cx="35" cy="73" rx="3.4" ry="5.6" fill="#FFF3C8" opacity="0.65" transform="rotate(-24 35 73)" />
        </g>

        {/* lấp lánh */}
        <g className="teddy-sparkles" fill="#FFF2C9">
          <path d="M159 66 c1.6 5 3 6.4 8 8 -5 1.6 -6.4 3 -8 8 -1.6 -5 -3 -6.4 -8 -8 5 -1.6 6.4 -3 8 -8Z" opacity="0.9" />
          <path d="M36 118 c1 3.2 1.9 4.1 5.1 5.1 -3.2 1 -4.1 1.9 -5.1 5.1 -1 -3.2 -1.9 -4.1 -5.1 -5.1 3.2 -1 4.1 -1.9 5.1 -5.1Z" opacity="0.7" />
        </g>
      </g>
    </svg>
  );
}

export function Butterfly({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg className={`butterfly ${className}`} viewBox="0 0 100 80" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD9E6" />
          <stop offset="55%" stopColor="#FF9DBB" />
          <stop offset="100%" stopColor="#D9C7FF" />
        </linearGradient>
      </defs>
      <g className="butterfly-wing butterfly-wing--left">
        <path d="M48 40 C 30 6 6 8 8 28 C 10 46 30 50 48 44Z" fill={`url(#${uid}-wing)`} opacity="0.95" />
        <path d="M48 44 C 34 58 16 70 12 60 C 8 50 26 42 48 42Z" fill={`url(#${uid}-wing)`} opacity="0.8" />
      </g>
      <g className="butterfly-wing butterfly-wing--right">
        <path d="M52 40 C 70 6 94 8 92 28 C 90 46 70 50 52 44Z" fill={`url(#${uid}-wing)`} opacity="0.95" />
        <path d="M52 44 C 66 58 84 70 88 60 C 92 50 74 42 52 42Z" fill={`url(#${uid}-wing)`} opacity="0.8" />
      </g>
      <ellipse cx="50" cy="44" rx="3.4" ry="15" fill="#6B3A4A" />
      <path d="M48 31 C 43 24 40 21 37 18 M52 31 C 57 24 60 21 63 18" stroke="#6B3A4A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="30" r="3" fill="#FFF" opacity="0.55" />
    </svg>
  );
}

export function Balloon({ className = "", color = "#FF9DBB" }: { className?: string; color?: string }) {
  return (
    <div className={`balloon ${className}`} aria-hidden="true">
      <svg viewBox="0 0 90 150">
        <defs>
          <radialGradient id={`bal-${color.replace("#", "")}`} cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#FFF6FA" />
            <stop offset="35%" stopColor={color} />
            <stop offset="100%" stopColor="#D96E94" />
          </radialGradient>
        </defs>
        <ellipse cx="45" cy="56" rx="34" ry="44" fill={`url(#bal-${color.replace("#", "")})`} />
        <path d="M45 100 l-7 10 h14 z" fill={color} />
        <path d="M45 108 C 56 122 36 132 48 148" stroke="#B98A9C" strokeWidth="1.6" fill="none" />
        <ellipse cx="32" cy="34" rx="9" ry="14" fill="#FFF" opacity="0.35" transform="rotate(-20 32 34)" />
      </svg>
    </div>
  );
}
