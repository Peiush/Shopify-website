import {useId} from 'react';

/**
 * Hand-built SVG illustrations for the HYPEFORGE brand.
 * Strokes with the `draw` class are animated by GSAP DrawSVG (line-drawing effect).
 */

export function SneakerArt({
  className = '',
  ...rest
}: React.SVGProps<SVGSVGElement> & {'data-draw'?: string}) {
  return (
    <svg
      {...rest}
      viewBox="0 0 600 300"
      fill="none"
      className={className}
      role="img"
      aria-label="Line illustration of a HYPEFORGE sneaker"
    >
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Upper */}
        <path
          className="draw"
          d="M55 214 C48 170 60 120 92 96 C120 104 160 112 196 100 L222 58 C236 52 252 52 262 60 L282 100 C330 118 400 140 470 158 C520 170 556 182 566 212"
        />
        {/* Heel tab */}
        <path className="draw" d="M70 120 L44 112 L50 176 L60 184" />
        {/* Collar padding */}
        <path className="draw" d="M96 112 C124 122 160 126 200 114" />
        {/* Midsole */}
        <path
          className="draw"
          d="M50 214 L566 214 C578 222 578 248 556 256 L72 256 C44 252 38 226 50 214 Z"
        />
        {/* Outsole tread */}
        <path
          className="draw"
          d="M90 256 L90 268 M140 256 L140 268 M190 256 L190 268 M240 256 L240 268 M290 256 L290 268 M340 256 L340 268 M390 256 L390 268 M440 256 L440 268 M490 256 L490 268"
        />
        {/* Toe cap stitching */}
        <path
          className="draw"
          strokeDasharray="6 8"
          d="M430 186 C480 182 530 190 556 206"
        />
        {/* Laces */}
        <path
          className="draw"
          d="M262 92 L300 112 M284 106 L322 122 M306 116 L346 130 M330 126 L370 138 M354 134 L392 146"
        />
      </g>
      {/* Eyelets */}
      <g fill="currentColor">
        {[262, 290, 318, 346, 374, 400].map((x, i) => (
          <circle key={x} cx={x} cy={96 + i * 9} r="3.5" />
        ))}
      </g>
      {/* Brand mark: the lightning stripe */}
      <path
        className="bolt"
        d="M150 204 L236 140 L226 170 L330 128 L240 204 L252 178 Z"
        fill="var(--color-volt)"
        stroke="var(--color-edge)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Spinning badge: text set on a circular path around a center glyph. */
export function CircleText({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <path
          id={`circle-${id}`}
          d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"
        />
      </defs>
      <circle cx="100" cy="100" r="99" fill="var(--color-volt)" />
      <text
        fill="var(--color-on-volt)"
        fontFamily="var(--font-sans)"
        fontSize="17"
        fontWeight="700"
        letterSpacing="4.2"
      >
        <textPath href={`#circle-${id}`}>{text}</textPath>
      </text>
      <path
        d="M92 70 L118 70 L104 98 L122 98 L86 134 L98 106 L80 106 Z"
        fill="var(--color-on-volt)"
      />
    </svg>
  );
}

/** Spiky sticker shape with a label, like a price burst on a shoebox. */
export function Starburst({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  const points = Array.from({length: 32}, (_, i) => {
    const r = i % 2 === 0 ? 98 : 80;
    const a = (Math.PI * 2 * i) / 32;
    return `${(100 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <polygon
        points={points}
        fill="var(--color-heat)"
        stroke="var(--color-edge)"
        strokeWidth="4"
      />
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fill="var(--color-bone)"
        fontFamily="var(--font-display)"
        fontSize="38"
      >
        {label}
      </text>
    </svg>
  );
}

/** Hand-drawn arrow doodle. */
export function ScribbleArrow({className = ''}: {className?: string}) {
  return (
    <svg viewBox="0 0 160 90" fill="none" className={className} aria-hidden="true">
      <path
        className="draw"
        d="M6 70 C30 20 80 10 112 30 C126 39 132 52 126 60 C118 70 100 58 112 44 C124 30 142 30 152 34"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className="draw"
        d="M138 22 L154 34 L140 46"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
