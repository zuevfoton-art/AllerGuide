import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

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

/** Reference onboarding art — line-art people, blue fills (#2563EB family) */

function Face({ cx, cy, r, stroke }: { cx: number; cy: number; r: number; stroke: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={SW} fill="#FFFFFF" />
      <Circle cx={cx - r * 0.28} cy={cy - r * 0.08} r={1.5} fill={stroke} />
      <Circle cx={cx + r * 0.28} cy={cy - r * 0.08} r={1.5} fill={stroke} />
      <Path
        d={`M${cx - r * 0.3} ${cy + r * 0.32} Q${cx} ${cy + r * 0.55} ${cx + r * 0.3} ${cy + r * 0.32}`}
        stroke={stroke}
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

function Connector({ x1, y1, x2, y2, stroke }: { x1: number; y1: number; x2: number; y2: number; stroke: string }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.3} opacity={0.28} />;
}

/** Slide 1 — family + scroll / shield / check (reference screen 1) */
export function ProfileSetupIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      {/* floating icons */}
      <G>
        <Connector x1={54} y1={62} x2={92} y2={88} stroke={stroke} />
        <Connector x1={140} y1={48} x2={140} y2={78} stroke={stroke} />
        <Connector x1={226} y1={62} x2={188} y2={88} stroke={stroke} />
        {/* scroll + profile */}
        <Rect x={36} y={38} width={28} height={36} rx={3} stroke={stroke} strokeWidth={1.6} fill="#FFFFFF" />
        <Path d="M42 44h16l3 5v21H39V49l3-5Z" stroke={stroke} strokeWidth={1.2} fill={accentLight} />
        <Circle cx={50} cy={56} r={4.5} stroke={stroke} strokeWidth={1.2} />
        <Path d="M45 64c2 3 8 3 10 0" stroke={stroke} strokeWidth={1.1} fill="none" />
        {/* shield above */}
        <Path
          d="M140 28 156 34v16c0 10-16 18-16 18s-16-8-16-18V34l16-6Z"
          fill={accent}
          stroke={stroke}
          strokeWidth={1.6}
        />
        <Path d="M140 40v12M134 46h12" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
        {/* check circle */}
        <Circle cx={226} cy={50} r={15} fill={accent} stroke={stroke} strokeWidth={1.6} />
        <Path d="M218 50l6 6 12-13" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </G>

      {/* Mother — long hair, blue top, white pants, holds child */}
      <G>
        <Path d="M78 58c-2-12 8-20 18-20 6 0 12 3 14 10" stroke={stroke} strokeWidth={SW} fill="none" />
        <Path d="M68 64c-8 14-6 28 2 36" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M96 60c6 8 4 18-2 24" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        <Face cx={92} cy={72} r={12} stroke={stroke} />
        <Path d="M78 86c2 26 8 40 14 46s12-20 14-46" stroke={stroke} strokeWidth={SW} fill={accent} />
        <Path d="M76 90c-12 8-14 22-10 34" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M78 132v36" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M98 132v36" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={78} y1={132} x2={98} y2={132} stroke={stroke} strokeWidth={SW} />
        {/* white pants blocks */}
        <Path d="M76 132h24v36H76v-36Z" fill="#FFFFFF" stroke={stroke} strokeWidth={1.6} />
        {/* child in arms */}
        <Face cx={118} cy={82} r={9} stroke={stroke} />
        <Path d="M110 70c0-5 4-8 8-8s8 3 8 8" stroke={stroke} strokeWidth={1.3} fill="none" />
        <Path d="M108 92c2 16 6 24 10 28s8-12 10-28" stroke={stroke} strokeWidth={1.5} fill={accentLight} />
        <Path d="M104 96c-8 4-10 12-6 18" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
      </G>

      {/* Father — blue hair, white tee, blue pants */}
      <G>
        <Path d="M162 54c0-10 8-16 16-16s16 6 16 16" stroke={stroke} strokeWidth={SW} fill={accent} />
        <Face cx={178} cy={64} r={13} stroke={stroke} />
        <Path d="M162 80c4 28 10 44 16 50s14-22 16-50" stroke={stroke} strokeWidth={SW} fill="#FFFFFF" />
        <Path d="M156 84c-14 6-18 20-14 32" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M194 86c12 4 16 16 12 28" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M168 130h20v38h-20v-38Z" fill={accent} stroke={stroke} strokeWidth={1.6} />
        <Line x1={168} y1={130} x2={188} y2={130} stroke={stroke} strokeWidth={SW} />
      </G>
    </Svg>
  );
}

/** Slide 2 — hand + clipboard + money + heart (reference screen 2) */
export function ScannerIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      {/* money bills */}
      <G opacity={0.95}>
        <Rect x={34} y={72} width={26} height={16} rx={2} fill={accent} stroke={stroke} strokeWidth={1.4} />
        <Circle cx={47} cy={80} r={4} stroke="#FFFFFF" strokeWidth={1.2} />
        <Rect x={42} y={94} width={22} height={14} rx={2} fill={accentLight} stroke={stroke} strokeWidth={1.4} />
      </G>
      {/* heart + pulse */}
      <G>
        <Path
          d="M228 78c-10-8-18-3-18 5 0 10 18 20 18 20s18-10 18-20c0-8-8-13-18-5Z"
          fill={accent}
          stroke={stroke}
          strokeWidth={1.6}
        />
        <Path d="M214 74h20M218 70v12M226 72v8" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
      </G>

      {/* blue hand from left */}
      <Path
        d="M18 148c28-18 52-62 78-78 8-5 18-2 22 8 4 12-6 28-18 38-20 16-48 28-72 32-10 2-14-6-10-14Z"
        fill={accent}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M88 78c6 8 4 18-4 24" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />

      {/* clipboard */}
      <G>
        <Rect x={108} y={52} width={88} height={118} rx={8} fill="#FFFFFF" stroke={accent} strokeWidth={2.4} />
        <Rect x={118} y={44} width={68} height={14} rx={4} fill={accent} stroke={stroke} strokeWidth={1.4} />
        <Path d="M152 38v12" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={152} cy={36} r={4} stroke={stroke} strokeWidth={1.4} />
        {/* medical cross header */}
        <Path d="M146 68v16M138 76h16" stroke={accent} strokeWidth={2.6} strokeLinecap="round" />
        {/* checklist */}
        <Rect x={122} y={92} width={12} height={12} rx={2} stroke={accent} strokeWidth={1.6} fill={accentLight} />
        <Rect x={122} y={112} width={12} height={12} rx={2} stroke={stroke} strokeWidth={1.4} />
        <Rect x={122} y={132} width={12} height={12} rx={2} stroke={stroke} strokeWidth={1.4} />
        <Line x1={140} y1={98} x2={182} y2={98} stroke={stroke} strokeWidth={1.4} opacity={0.45} />
        <Line x1={140} y1={118} x2={176} y2={118} stroke={stroke} strokeWidth={1.4} opacity={0.45} />
        <Line x1={140} y1={138} x2={180} y2={138} stroke={stroke} strokeWidth={1.4} opacity={0.45} />
        <Path d="M125 98l3 3 6-7" stroke={accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}

/** Slide 3 — family under striped umbrella + shield + smiley (reference screen 3) */
export function DailyCareIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <FloatingSmiley x={214} y={28} stroke={stroke} />
      <ShieldIcon x={38} y={118} stroke={stroke} accent={accent} />

      {/* striped umbrella */}
      <Path d="M34 108c36-48 76-58 106-58s70 10 106 58" fill={accent} fillOpacity={0.22} stroke={stroke} strokeWidth={2} />
      <Path d="M34 108c18-28 42-40 70-46" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" opacity={0.55} />
      <Path d="M88 62c28-6 52 2 70 46" stroke={accent} strokeWidth={12} strokeLinecap="round" opacity={0.35} />
      <Path d="M140 56c24 4 48 20 66 52" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" opacity={0.5} />
      <Line x1={140} y1={108} x2={140} y2={174} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />

      {/* Mother */}
      <G>
        <Path d="M96 86c0-9 7-15 14-15s14 6 14 15" stroke={stroke} strokeWidth={SW} fill="none" />
        <Path d="M88 92c-6 10-4 20 4 26" stroke={stroke} strokeWidth={1.6} />
        <Face cx={110} cy={90} r={11} stroke={stroke} />
        <Path d="M96 104c3 26 8 40 14 46s12-20 14-46" stroke={stroke} strokeWidth={SW} fill={accent} />
        <Path d="M104 150v26" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M120 150v26" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Line x1={104} y1={150} x2={120} y2={150} stroke={stroke} strokeWidth={SW} />
        <Path d="M102 150h20v26h-20v-26Z" fill="#FFFFFF" stroke={stroke} strokeWidth={1.4} />
      </G>

      {/* Father — holds umbrella, blue pants, white shirt */}
      <G>
        <Path d="M154 78c0-10 8-16 16-16s16 6 16 16" stroke={stroke} strokeWidth={SW} fill={accent} />
        <Face cx={170} cy={82} r={12} stroke={stroke} />
        <Path d="M154 96c4 28 10 44 16 50s14-22 16-50" stroke={stroke} strokeWidth={SW} fill="#FFFFFF" />
        <Path d="M148 100c-12 4-16 16-12 28" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M188 102c14 2 18 14 14 26" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M160 146h22v30h-22v-30Z" fill={accent} stroke={stroke} strokeWidth={1.6} />
        <Path d="M140 108c-4 8-2 16 4 20" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      </G>

      {/* Child front center */}
      <G>
        <Face cx={140} cy={118} r={9} stroke={stroke} />
        <Path d="M132 106c0-5 4-8 8-8s8 3 8 8" stroke={stroke} strokeWidth={1.3} fill="none" />
        <Path d="M130 128c2 18 6 28 10 32s8-14 10-32" stroke={stroke} strokeWidth={1.5} fill={accentLight} />
        <Line x1={134} y1={160} x2={132} y2={176} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        <Line x1={148} y1={160} x2={150} y2={176} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function ShieldIcon({ x, y, stroke, accent }: { x: number; y: number; stroke: string; accent: string }) {
  return (
    <G>
      <Path
        d={`M${x + 16} ${y} ${x + 32} ${y + 6}v14c0 9-16 16-16 16s-16-7-16-16V${y + 6}l16-6Z`}
        fill={accent}
        stroke={stroke}
        strokeWidth={1.6}
      />
      <Path d={`M${x + 16} ${y + 12}v10M${x + 11} ${y + 17}h10`} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

function FloatingSmiley({ x, y, stroke }: { x: number; y: number; stroke: string }) {
  return (
    <G>
      <Circle cx={x + 14} cy={y + 14} r={14} stroke={stroke} strokeWidth={1.6} fill="#FFFFFF" />
      <Path d={`M${x + 8} ${y + 16}a6 6 0 1 0 12 0`} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Circle cx={x + 11} cy={y + 12} r={1.4} fill={stroke} />
      <Circle cx={x + 19} cy={y + 12} r={1.4} fill={stroke} />
    </G>
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
