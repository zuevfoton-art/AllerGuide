import {
  Button,
  Callout,
  H1,
  Pill,
  Row,
  Spacer,
  Stack,
  Text,
  TextInput,
  useCanvasAction,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type ViewState = "default" | "loading";

export default function MockupHomeCanvas() {
  const theme = useHostTheme();
  const dispatch = useCanvasAction();
  const [view, setView] = useCanvasState<ViewState>("home-view", "default");
  const [brand, setBrand] = useCanvasState("home-brand", "A-Claro");
  const [tagline, setTagline] = useCanvasState("home-tagline", "Аллергия. Ясно.");
  const [title, setTitle] = useCanvasState("home-title", "Сегодня");
  const [subtitle, setSubtitle] = useCanvasState(
    "home-subtitle",
    "29 июля · Профиль: Маша",
  );
  const [wellnessTitle, setWellnessTitle] = useCanvasState(
    "home-wellness",
    "Сводка самочувствия",
  );
  const [score, setScore] = useCanvasState("home-score", "78 / 100");
  const [diaryTitle, setDiaryTitle] = useCanvasState("home-diary", "Дневник");
  const [entryCta, setEntryCta] = useCanvasState("home-entry", "+ Запись");

  return (
    <Stack gap={16}>
      <Row align="center">
        <H1>Mockup · Home</H1>
        <Spacer />
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "docs/screens/home.html" })
          }
        >
          HTML
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "apps/mobile/app/(tabs)/home.tsx" })
          }
        >
          TSX
        </Button>
      </Row>
      <Text tone="secondary">
        As-is from `app/(tabs)/home.tsx`. Brand logo + hero (no ScreenEyebrow).
      </Text>
      <Callout tone="info" title="data-component map">
        BrandLogo · HeroToday · ProfileSwitcher · WellnessSummaryCard ·
        DiaryShortcutsCard · Skeleton · Disclaimer
      </Callout>

      <Row gap={8}>
        <Button
          variant={view === "default" ? "primary" : "secondary"}
          onClick={() => setView("default")}
        >
          default
        </Button>
        <Button
          variant={view === "loading" ? "primary" : "secondary"}
          onClick={() => setView("loading")}
        >
          loading
        </Button>
      </Row>

      <Row gap={16} align="start" wrap>
        <Stack gap={10} style={{ minWidth: 280, flex: 1 }}>
          <Text weight="semibold">Editable copy</Text>
          <TextInput value={brand} onChange={setBrand} />
          <TextInput value={tagline} onChange={setTagline} />
          <TextInput value={title} onChange={setTitle} />
          <TextInput value={subtitle} onChange={setSubtitle} />
          <TextInput value={wellnessTitle} onChange={setWellnessTitle} />
          <TextInput value={score} onChange={setScore} />
          <TextInput value={diaryTitle} onChange={setDiaryTitle} />
          <TextInput value={entryCta} onChange={setEntryCta} />
        </Stack>

        <div
          style={{
            width: 390,
            border: `1px solid ${theme.stroke.primary}`,
            borderRadius: 28,
            background: theme.bg.editor,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              borderBottom: `1px solid ${theme.stroke.tertiary}`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Text size="small" weight="semibold">
              9:41
            </Text>
            <Text size="small" tone="tertiary">
              Home
            </Text>
            <Text size="small" tone="tertiary">
              LTE
            </Text>
          </div>

          <div style={{ padding: 12 }}>
            <Stack gap={10}>
              <Row align="center">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text weight="bold" style={{ fontSize: 18 }}>
                    {brand}
                  </Text>
                  <Text size="small" tone="tertiary">
                    {tagline}
                  </Text>
                </Stack>
                <Pill>SOS</Pill>
              </Row>

              <div
                style={{
                  border: `1px solid ${theme.stroke.secondary}`,
                  borderRadius: 14,
                  padding: 12,
                  background: theme.fill.tertiary,
                }}
              >
                <Text weight="bold" style={{ fontSize: 22 }}>
                  {title}
                </Text>
                <Text size="small" tone="secondary">
                  {view === "loading" ? "Загрузка…" : subtitle}
                </Text>
              </div>

              <Row gap={6}>
                <Pill active>Маша</Pill>
                <Pill>Папа</Pill>
              </Row>

              {view === "loading" ? (
                <div
                  style={{
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 10,
                    padding: 12,
                    background: theme.bg.elevated,
                  }}
                >
                  <Text size="small" tone="tertiary" weight="semibold">
                    Skeleton
                  </Text>
                  <div
                    style={{
                      marginTop: 8,
                      height: 10,
                      background: theme.fill.secondary,
                      borderRadius: 4,
                      width: "40%",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 8,
                      height: 10,
                      background: theme.fill.secondary,
                      borderRadius: 4,
                      width: "70%",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 8,
                      height: 10,
                      background: theme.fill.secondary,
                      borderRadius: 4,
                      width: "55%",
                    }}
                  />
                </div>
              ) : (
                <Stack gap={10}>
                  <div
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 10,
                      padding: 10,
                      background: theme.bg.elevated,
                    }}
                  >
                    <Row align="center">
                      <Text weight="semibold">{wellnessTitle}</Text>
                      <Spacer />
                      <Pill active>стабильно</Pill>
                    </Row>
                    <Text weight="bold" style={{ fontSize: 28, marginTop: 8 }}>
                      {score}
                    </Text>
                    <Text size="small" tone="secondary" style={{ marginTop: 6 }}>
                      Среда: умеренная нагрузка пыльцы
                    </Text>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 10,
                      padding: 10,
                      background: theme.bg.elevated,
                    }}
                  >
                    <Row align="center">
                      <Text weight="semibold">{diaryTitle}</Text>
                      <Spacer />
                      <Text size="small" tone="secondary">
                        Больше
                      </Text>
                    </Row>
                    <Row align="center" style={{ marginTop: 10 }}>
                      <Text size="small">Симптомы</Text>
                      <Spacer />
                      <Pill active>{entryCta}</Pill>
                    </Row>
                    <Row align="center" style={{ marginTop: 8 }}>
                      <Text size="small">Еда</Text>
                      <Spacer />
                      <Pill active>{entryCta}</Pill>
                    </Row>
                  </div>
                </Stack>
              )}
            </Stack>
          </div>

          <div
            style={{
              borderTop: `1px solid ${theme.stroke.tertiary}`,
              padding: "8px 4px 12px",
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
            }}
          >
            <Text
              size="small"
              weight="semibold"
              tone="secondary"
              style={{ textAlign: "center" }}
            >
              Home
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Diary
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Scan
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Market
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Map
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              SOS
            </Text>
          </div>
        </div>
      </Row>
    </Stack>
  );
}
