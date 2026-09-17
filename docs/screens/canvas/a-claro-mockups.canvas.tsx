import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
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

type ScreenId = "sos" | "home" | "diary" | "scanner";

export default function AClaroMockupsCatalog() {
  const dispatch = useCanvasAction();
  const theme = useHostTheme();
  const [active, setActive] = useCanvasState<ScreenId>("catalog-active", "sos");
  const [eyebrow, setEyebrow] = useCanvasState("catalog-eyebrow", "A-Claro · SOS");
  const [title, setTitle] = useCanvasState("catalog-title", "SOS");
  const [subtitle, setSubtitle] = useCanvasState(
    "catalog-subtitle",
    "Экстренная информация",
  );
  const [cta, setCta] = useCanvasState("catalog-cta", "Позвонить 103");

  const meta =
    active === "sos"
      ? {
          name: "SOS",
          mockup: "docs/screens/sos.html",
          code: "apps/mobile/app/(tabs)/sos.tsx",
          canvas: "mockup-sos.canvas.tsx",
          route: "/(tabs)/sos",
        }
      : active === "home"
        ? {
            name: "Home",
            mockup: "docs/screens/home.html",
            code: "apps/mobile/app/(tabs)/home.tsx",
            canvas: "mockup-home.canvas.tsx",
            route: "/(tabs)/home",
          }
        : active === "diary"
          ? {
              name: "Diary",
              mockup: "docs/screens/diary.html",
              code: "apps/mobile/app/(tabs)/diary.tsx",
              canvas: "mockup-diary.canvas.tsx",
              route: "/(tabs)/diary",
            }
          : {
              name: "Scanner",
              mockup: "docs/screens/scanner.html",
              code: "apps/mobile/app/(tabs)/scanner.tsx",
              canvas: "mockup-scanner.canvas.tsx",
              route: "/(tabs)/scanner",
            };

  return (
    <Stack gap={18}>
      <Stack gap={6}>
        <H1>A-Claro mockups (Desktop Canvas)</H1>
        <Text tone="secondary">
          Edit copy here and preview on the phone frame. Open sibling files
          `mockup-*.canvas.tsx` from the same canvases folder for full layouts.
        </Text>
      </Stack>

      <Callout tone="warning" title="Must run as LOCAL Desktop agent">
        Cloud Agent cannot host Canvas UI (failed to load). Install canvases with
        `docs/screens/canvas/install-windows.ps1`, then open them from a local
        Agent chat in Cursor Desktop.
      </Callout>

      <H2>Screens</H2>
      <Row gap={8} wrap>
        <Button
          variant={active === "sos" ? "primary" : "secondary"}
          onClick={() => {
            setActive("sos");
            setEyebrow("A-Claro · SOS");
            setTitle("SOS");
            setSubtitle("Экстренная информация");
            setCta("Позвонить 103");
          }}
        >
          1. SOS
        </Button>
        <Button
          variant={active === "home" ? "primary" : "secondary"}
          onClick={() => {
            setActive("home");
            setEyebrow("A-Claro");
            setTitle("Сегодня");
            setSubtitle("Профиль: Маша");
            setCta("+ Запись");
          }}
        >
          2. Home
        </Button>
        <Button
          variant={active === "diary" ? "primary" : "secondary"}
          onClick={() => {
            setActive("diary");
            setEyebrow("A-Claro · Наблюдения");
            setTitle("Дневник");
            setSubtitle("Пошаговые записи наблюдений");
            setCta("+ Новая запись по шагам");
          }}
        >
          3. Diary
        </Button>
        <Button
          variant={active === "scanner" ? "primary" : "secondary"}
          onClick={() => {
            setActive("scanner");
            setEyebrow("A-Claro · Сканер");
            setTitle("Умный сканер");
            setSubtitle("Проверка состава по профилю аллергий");
            setCta("Проверить");
          }}
        >
          4. Scanner
        </Button>
      </Row>

      <Grid columns="1.2fr 390px" gap={16}>
        <Card>
          <CardHeader trailing={<Pill active>{meta.route}</Pill>}>
            {meta.name} — live edit
          </CardHeader>
          <CardBody>
            <Stack gap={12}>
              <Stack gap={4}>
                <Text size="small" tone="tertiary" weight="semibold">
                  Eyebrow
                </Text>
                <TextInput value={eyebrow} onChange={setEyebrow} />
              </Stack>
              <Stack gap={4}>
                <Text size="small" tone="tertiary" weight="semibold">
                  Title
                </Text>
                <TextInput value={title} onChange={setTitle} />
              </Stack>
              <Stack gap={4}>
                <Text size="small" tone="tertiary" weight="semibold">
                  Subtitle
                </Text>
                <TextInput value={subtitle} onChange={setSubtitle} />
              </Stack>
              <Stack gap={4}>
                <Text size="small" tone="tertiary" weight="semibold">
                  Primary CTA
                </Text>
                <TextInput value={cta} onChange={setCta} />
              </Stack>
              <Divider />
              <Text size="small" tone="secondary">
                Full mockup file: <Code>{meta.canvas}</Code>
              </Text>
              <Text size="small" tone="secondary">
                HTML: <Code>{meta.mockup}</Code>
              </Text>
              <Text size="small" tone="secondary">
                Code: <Code>{meta.code}</Code>
              </Text>
              <Row gap={8} wrap>
                <Button
                  variant="secondary"
                  onClick={() => dispatch({ type: "openFile", path: meta.mockup })}
                >
                  Open HTML
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => dispatch({ type: "openFile", path: meta.code })}
                >
                  Open TSX
                </Button>
                <Spacer />
                <Button
                  variant="ghost"
                  onClick={() =>
                    dispatch({
                      type: "newComposerChat",
                      userPrompt: `Edit canvas file ${meta.canvas} for ${meta.name}. useHostTheme tokens only. Then sync approved copy into ${meta.mockup} and list handoff deltas for ${meta.code}.`,
                    })
                  }
                >
                  Ask agent to edit
                </Button>
              </Row>
            </Stack>
          </CardBody>
        </Card>

        <div
          style={{
            width: 390,
            maxWidth: "100%",
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
              {meta.name}
            </Text>
            <Text size="small" tone="tertiary">
              LTE
            </Text>
          </div>
          <div style={{ padding: 12 }}>
            <Stack gap={10}>
              <Text size="small" tone="tertiary" weight="semibold">
                {eyebrow}
              </Text>
              <Text weight="bold" style={{ fontSize: 22 }}>
                {title}
              </Text>
              <Text size="small" tone="secondary">
                {subtitle}
              </Text>
              <div
                style={{
                  border: `1px solid ${theme.stroke.secondary}`,
                  borderRadius: 10,
                  padding: 10,
                  background: theme.bg.elevated,
                }}
              >
                <Text size="small" tone="tertiary" weight="semibold">
                  ProfileSwitcher
                </Text>
                <Row gap={6} style={{ marginTop: 6 }}>
                  <Pill active>Маша</Pill>
                  <Pill>Папа</Pill>
                </Row>
              </div>
              <div
                style={{
                  background: theme.fill.primary,
                  color: theme.text.onAccent,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {cta}
              </div>
            </Stack>
          </div>
        </div>
      </Grid>

      <H2>Sibling mockup files</H2>
      <Text size="small" tone="secondary">
        Open from the canvases folder: `mockup-sos.canvas.tsx`,
        `mockup-home.canvas.tsx`, `mockup-diary.canvas.tsx`,
        `mockup-scanner.canvas.tsx`, `smoke.canvas.tsx`.
      </Text>
    </Stack>
  );
}
