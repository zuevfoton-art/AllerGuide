import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

type IllustrationProps = {
  width?: number;
  height?: number;
  stroke?: string;
  accent?: string;
  accentLight?: string;
};

const DEFAULT_W = 280;
const DEFAULT_H = 220;
const SW = 2;
const SW_THIN = 1.6;

type PersonBits = {
  stroke: string;
  accent: string;
  skin?: string;
};

/** Minimal face — dot eyes + smile (reference style) */
function Face({ cx, cy, r, stroke }: { cx: number; cy: number; r: number; stroke: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={SW} fill="#FFFFFF" />
      <Circle cx={cx - r * 0.32} cy={cy - r * 0.1} r={1.6} fill={stroke} />
      <Circle cx={cx + r * 0.32} cy={cy - r * 0.1} r={1.6} fill={stroke} />
      <Path
        d={`M${cx - r * 0.35} ${cy + r * 0.35} Q${cx} ${cy + r * 0.62} ${cx + r * 0.35} ${cy + r * 0.35}`}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

function FloatingIcon({
  x,
  y,
  stroke,
  accent,
  accentLight,
  kind,
}: {
  x: number;
  y: number;
  stroke: string;
  accent: string;
  accentLight: string;
  kind: 'profile' | 'shield' | 'check' | 'barcode' | 'heart' | 'smile';
}) {
  if (kind === 'profile') {
    return (
      <G>
        <Rect x={x} y={y} width={34} height={42} rx={4} stroke={stroke} strokeWidth={SW_THIN} fill="#FFFFFF" />
        <Path d={`M${x + 8} ${y + 6}h18l4 6v26H${x + 4}V${y + 12}l4-6Z`} stroke={stroke} strokeWidth={1.4} fill={accentLight} />
        <Circle cx={x + 17} cy={y + 24} r={5} stroke={stroke} strokeWidth={1.2} />
        <Path d={`M${x + 12} ${y + 34}c2 4 10 4 10 0`} stroke={stroke} strokeWidth={1.2} fill="none" />
      </G>
    );
  }
  if (kind === 'shield') {
    return (
      <G>
        <Path
          d={`M${x + 17} ${y + 4}  ${x + 32} ${y + 10}v14c0 9-15 16-15 16s-15-7-15-16V${y + 10}l15-6Z`}
          stroke={stroke}
          strokeWidth={SW_THIN}
          fill={accentLight}
        />
        <Path d={`M${x + 17} ${y + 16}v10M${x + 12} ${y + 21}h10`} stroke={accent} strokeWidth={2} strokeLinecap="round" />
      </G>
    );
  }
  if (kind === 'check') {
    return (
      <G>
        <Circle cx={x + 14} cy={y + 14} r={14} stroke={stroke} strokeWidth={SW_THIN} fill="#FFFFFF" />
        <Path d={`M${x + 7} ${y + 14}l5 5 10-11`} stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    );
  }
  if (kind === 'barcode') {
    return (
      <G>
        <Rect x={x} y={y + 6} width={30} height={22} rx={3} stroke={stroke} strokeWidth={SW_THIN} fill="#FFFFFF" />
        <Line x1={x + 5} y1={y + 10} x2={x + 5} y2={y + 24} stroke={stroke} strokeWidth={2} />
        <Line x1={x + 9} y1={y + 10} x2={x + 9} y2={y + 24} stroke={stroke} strokeWidth={1} />
        <Line x1={x + 13} y1={y + 10} x2={x + 13} y2={y + 24} stroke={stroke} strokeWidth={2.4} />
        <Line x1={x + 18} y1={y + 10} x2={x + 18} y2={y + 24} stroke={stroke} strokeWidth={1.2} />
        <Line x1={x + 22} y1={y + 10} x2={x + 22} y2={y + 24} stroke={stroke} strokeWidth={2} />
      </G>
    );
  }
  if (kind === 'heart') {
    return (
      <G>
        <Path
          d={`M${x + 16} ${y + 22}c-8-6-14-2-14 4 0 8 14 16 14 16s14-8 14-16c0-6-6-10-14-4Z`}
          stroke={stroke}
          strokeWidth={SW_THIN}
          fill={accentLight}
        />
        <Path d={`M${x + 10} ${y + 16}h12M${x + 16} ${y + 10}v12`} stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
      </G>
    );
  }
  return (
    <G>
      <Circle cx={x + 14} cy={y + 14} r={14} stroke={stroke} strokeWidth={SW_THIN} fill="#FFFFFF" />
      <Path d={`M${x + 8} ${y + 16}a6 6 0 1 0 12 0`} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Circle cx={x + 11} cy={y + 12} r={1.4} fill={stroke} />
      <Circle cx={x + 19} cy={y + 12} r={1.4} fill={stroke} />
    </G>
  );
}

function Connector({ x1, y1, x2, y2, stroke }: { x1: number; y1: number; x2: number; y2: number; stroke: string }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.35} />;
}

/** Slide 1 — family registering allergy profiles */
export function ProfileSetupIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  const p: PersonBits = { stroke, accent };
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <Ellipse cx="140" cy="188" rx="88" ry="10" fill={stroke} opacity={0.06} />

      <Connector x1={52} y1={56} x2={98} y2={88} stroke={stroke} />
      <Connector x1={210} y1={52} x2={168} y2={82} stroke={stroke} />
      <Connector x1={248} y1={82} x2={198} y2={76} stroke={stroke} />
      <FloatingIcon x={38} y={28} stroke={stroke} accent={accent} accentLight={accentLight} kind="profile" />
      <FloatingIcon x={196} y={22} stroke={stroke} accent={accent} accentLight={accentLight} kind="shield" />
      <FloatingIcon x={234} y={58} stroke={stroke} accent={accent} accentLight={accentLight} kind="check" />

      {/* Mother */}
      <G>
        <Path d="M72 62c0-8 6-14 14-14s14 6 14 14" stroke={stroke} strokeWidth={SW} fill="none" />
        <Path d="M68 68c-4 10-2 18 4 22" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        <Face cx={86} cy={72} r={13} stroke={p.stroke} />
        <Path
          d="M72 88c2 28 8 42 14 48s12-20 14-48"
          stroke={stroke}
          strokeWidth={SW}
          strokeLinecap="round"
          fill={accent}
          fillOpacity={0.22}
        />
        <Path d="M68 92c-10 6-14 16-12 26" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M104 94c8 4 12 14 10 24" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={78} y1={136} x2={74} y2={168} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={98} y1={136} x2={102} y2={168} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Father */}
      <G>
        <Path d="M148 54c0-9 7-15 15-15s15 6 15 15" stroke={stroke} strokeWidth={SW} fill="none" />
        <Face cx={163} cy={64} r={14} stroke={p.stroke} />
        <Path
          d="M147 82c3 30 10 46 16 52s14-22 16-52"
          stroke={stroke}
          strokeWidth={SW}
          strokeLinecap="round"
          fill={accent}
          fillOpacity={0.35}
        />
        <Path d="M142 86c-12 4-18 14-16 26" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M178 88c10 2 16 12 14 24" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={155} y1={134} x2={150} y2={168} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={175} y1={134} x2={180} y2={168} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Child (in father's arms) */}
      <G>
        <Face cx={196} cy={78} r={10} stroke={p.stroke} />
        <Path d="M188 62c0-5 4-8 8-8s8 3 8 8" stroke={stroke} strokeWidth={1.4} fill="none" />
        <Path
          d="M186 90c2 18 6 28 10 32s8-14 10-32"
          stroke={stroke}
          strokeWidth={1.6}
          fill={accent}
          fillOpacity={0.28}
        />
        <Path d="M182 94c-8 2-10 10-8 16" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M206 96c6 0 10 6 10 14" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** Slide 2 — person scanning a product label */
export function ScannerIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <Ellipse cx="150" cy="188" rx="80" ry="10" fill={stroke} opacity={0.06} />

      <FloatingIcon x={28} y={36} stroke={stroke} accent={accent} accentLight={accentLight} kind="barcode" />
      <FloatingIcon x={218} y={30} stroke={stroke} accent={accent} accentLight={accentLight} kind="shield" />
      <FloatingIcon x={236} y={72} stroke={stroke} accent={accent} accentLight={accentLight} kind="heart" />
      <Connector x1={58} y1={52} x2={108} y2={88} stroke={stroke} />
      <Connector x1={232} y1={48} x2={188} y2={78} stroke={stroke} />

      {/* Product on counter */}
      <Rect x={118} y={118} width={72} height={52} rx={6} stroke={stroke} strokeWidth={SW} fill="#FFFFFF" />
      <Rect x={128} y={128} width={52} height={18} rx={2} fill={accentLight} />
      <Line x1={132} y1={152} x2={132} y2={164} stroke={stroke} strokeWidth={2.2} />
      <Line x1={138} y1={152} x2={138} y2={164} stroke={stroke} strokeWidth={1.2} />
      <Line x1={144} y1={152} x2={144} y2={164} stroke={stroke} strokeWidth={2.6} />
      <Line x1={150} y1={152} x2={150} y2={164} stroke={stroke} strokeWidth={1.4} />
      <Line x1={156} y1={152} x2={156} y2={164} stroke={stroke} strokeWidth={2.2} />
      <Line x1={162} y1={152} x2={162} y2={164} stroke={stroke} strokeWidth={1.2} />
      <Line x1={168} y1={152} x2={168} y2={164} stroke={stroke} strokeWidth={2.8} />

      {/* Scan frame */}
      <Path d="M108 108h22M108 108v18M192 108h-22M192 108v18M108 178h22M108 178v-18M192 178h-22M192 178v-18" stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={108} y1={143} x2={192} y2={143} stroke={accent} strokeWidth={1.8} strokeDasharray="5 4" />

      {/* Woman scanning */}
      <G>
        <Path d="M58 70c0-10 8-17 16-17s16 7 16 17" stroke={stroke} strokeWidth={SW} fill="none" />
        <Path d="M52 78c-6 8-4 16 2 20" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        <Face cx={74} cy={76} r={13} stroke={stroke} />
        <Path
          d="M58 94c4 32 10 48 16 54s12-22 14-54"
          stroke={stroke}
          strokeWidth={SW}
          fill={accent}
          fillOpacity={0.3}
        />
        <Path d="M54 98c-12 6-16 18-12 30" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        {/* arm + phone */}
        <Path d="M88 108c18-6 32-4 42 8" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Rect x={124} y={96} width={34} height={58} rx={8} stroke={stroke} strokeWidth={SW} fill="#FFFFFF" />
        <Rect x={130} y={104} width={22} height={36} rx={3} fill={accentLight} />
        <Circle cx={142} cy={144} r={3} stroke={stroke} strokeWidth={1.2} />
        <Line x1={74} y1={148} x2={70} y2={176} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={90} y1={148} x2={94} y2={176} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Child watching */}
      <G>
        <Face cx={218} cy={108} r={11} stroke={stroke} />
        <Path d="M210 94c0-6 5-9 8-9s8 3 8 9" stroke={stroke} strokeWidth={1.4} fill="none" />
        <Path d="M206 118c2 22 6 34 10 38s8-16 10-38" stroke={stroke} strokeWidth={1.6} fill={accent} fillOpacity={0.2} />
        <Line x1={212} y1={156} x2={208} y2={176} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        <Line x1={226} y1={156} x2={230} y2={176} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** Slide 3 — family under protective umbrella */
export function DailyCareIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <Ellipse cx="140" cy="188" rx={90} ry={10} fill={stroke} opacity={0.06} />

      <FloatingIcon x={214} y={24} stroke={stroke} accent={accent} accentLight={accentLight} kind="smile" />

      {/* Umbrella */}
      <Path
        d="M36 108c46-58 162-58 208 0"
        stroke={accent}
        strokeWidth={2.8}
        strokeLinecap="round"
        fill={accent}
        fillOpacity={0.18}
      />
      <Line x1={140} y1={108} x2={140} y2={172} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />

      {/* Woman */}
      <G>
        <Path d="M98 88c0-9 7-15 14-15s14 6 14 15" stroke={stroke} strokeWidth={SW} fill="none" />
        <Face cx={112} cy={92} r={12} stroke={stroke} />
        <Path
          d="M98 108c3 28 8 42 14 48s12-20 14-48"
          stroke={stroke}
          strokeWidth={SW}
          fill={accent}
          fillOpacity={0.28}
        />
        <Line x1={104} y1={156} x2={100} y2={176} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={122} y1={156} x2={126} y2={176} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Man with shield */}
      <G>
        <Path d="M158 82c0-10 8-16 16-16s16 6 16 16" stroke={stroke} strokeWidth={SW} fill="none" />
        <Face cx={174} cy={86} r={13} stroke={stroke} />
        <Path
          d="M158 104c4 30 10 46 16 52s14-22 16-52"
          stroke={stroke}
          strokeWidth={SW}
          fill={accent}
          fillOpacity={0.38}
        />
        <Path d="M152 108c-12 4-16 16-12 28" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={166} y1={156} x2={162} y2={176} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={186} y1={156} x2={190} y2={176} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        {/* Shield in hand */}
        <Path
          d="M196 118 208 122v12c0 7-12 12-12 12s-12-5-12-12v-12l12-4Z"
          stroke={stroke}
          strokeWidth={SW_THIN}
          fill={accentLight}
        />
        <Path d="M196 126v8M191 130h10" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
      </G>

      {/* Child in front */}
      <G>
        <Face cx={140} cy={124} r={10} stroke={stroke} />
        <Path d="M132 110c0-5 4-8 8-8s8 3 8 8" stroke={stroke} strokeWidth={1.4} fill="none" />
        <Path
          d="M130 136c2 20 6 30 10 34s8-14 10-34"
          stroke={stroke}
          strokeWidth={1.6}
          fill={accent}
          fillOpacity={0.25}
        />
        <Line x1={134} y1={170} x2={132} y2={176} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        <Line x1={148} y1={170} x2={150} y2={176} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export type OnboardingSlideKey = 'profile' | 'scanner' | 'care';

export function OnboardingIllustration({
  slide,
  ...props
}: IllustrationProps & { slide: OnboardingSlideKey }) {
  switch (slide) {
    case 'profile':
      return <ProfileSetupIllustration {...props} />;
    case 'scanner':
      return <ScannerIllustration {...props} />;
    case 'care':
      return <DailyCareIllustration {...props} />;
  }
}
