import {
  Button,
  Callout,
  H1,
  Pill,
  Row,
  Spacer,
  Stack,
  Text,
  TextArea,
  TextInput,
  useCanvasAction,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type ViewState = "default" | "safe" | "error";

export default function MockupScannerCanvas() {
  const theme = useHostTheme();
  const dispatch = useCanvasAction();
  const [view, setView] = useCanvasState<ViewState>("scanner-view", "default");
  const [eyebrow, setEyebrow] = useCanvasState(
    "scanner-eyebrow",
    "A-Claro · Сканер",
  );
  const [title, setTitle] = useCanvasState("scanner-title", "Умный сканер");
  const [subtitle, setSubtitle] = useCanvasState(
    "scanner-subtitle",
    "Проверка состава по профилю аллергий",
  );
  const [manual, setManual] = useCanvasState(
    "scanner-manual",
    "молоко, арахис, сахар",
  );
  const [checkCta, setCheckCta] = useCanvasState("scanner-check", "Проверить");
  const [openCta, setOpenCta] = useCanvasState("scanner-open", "Открыть");
  const [verdict, setVerdict] = useCanvasState(
    "scanner-verdict",
    "Claro: совпадений с профилем не найдено",
  );
  const [errorTitle, setErrorTitle] = useCanvasState(
    "scanner-error",
    "Не удалось проверить",
  );

  return (
    <Stack gap={16}>
      <Row align="center">
        <H1>Mockup · Scanner</H1>
        <Spacer />
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "docs/screens/scanner.html" })
          }
        >
          HTML
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({
              type: "openFile",
              path: "apps/mobile/app/(tabs)/scanner.tsx",
            })
          }
        >
          TSX
        </Button>
      </Row>
      <Text tone="secondary">
        As-is from `app/(tabs)/scanner.tsx`. Demo manual input is intentional in
        as-is; clear to placeholder on UX pass.
      </Text>
      <Callout tone="info" title="data-component map">
        ModeChips · ScanActionCard · ManualInput · CheckButton · ScanResultCard ·
        ErrorState · ScanHistory
      </Callout>

      <Row gap={8} wrap>
        <Button
          variant={view === "default" ? "primary" : "secondary"}
          onClick={() => setView("default")}
        >
          default
        </Button>
        <Button
          variant={view === "safe" ? "primary" : "secondary"}
          onClick={() => setView("safe")}
        >
          result safe
        </Button>
        <Button
          variant={view === "error" ? "primary" : "secondary"}
          onClick={() => setView("error")}
        >
          error
        </Button>
      </Row>

      <Row gap={16} align="start" wrap>
        <Stack gap={10} style={{ minWidth: 280, flex: 1 }}>
          <Text weight="semibold">Editable copy</Text>
          <TextInput value={eyebrow} onChange={setEyebrow} />
          <TextInput value={title} onChange={setTitle} />
          <TextInput value={subtitle} onChange={setSubtitle} />
          <TextArea value={manual} onChange={setManual} rows={3} />
          <TextInput value={openCta} onChange={setOpenCta} />
          <TextInput value={checkCta} onChange={setCheckCta} />
          <TextInput value={verdict} onChange={setVerdict} />
          <TextInput value={errorTitle} onChange={setErrorTitle} />
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
              Scanner
            </Text>
            <Text size="small" tone="tertiary">
              LTE
            </Text>
          </div>

          <div style={{ padding: 12 }}>
            <Stack gap={10}>
              <Stack gap={2}>
                <Text size="small" tone="tertiary" weight="semibold">
                  {eyebrow}
                </Text>
                <Text weight="bold" style={{ fontSize: 22 }}>
                  {title}
                </Text>
                <Text size="small" tone="secondary">
                  {subtitle}
                </Text>
              </Stack>

              <Row gap={6}>
                <Pill active>Маша</Pill>
                <Pill>Папа</Pill>
              </Row>

              <Row gap={6} wrap>
                <Pill active>Продукт</Pill>
                <Pill>Меню</Pill>
                <Pill>Лекарство</Pill>
                <Pill>Косметика</Pill>
              </Row>

              {view === "safe" ? (
                <div
                  style={{
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 10,
                    padding: 12,
                    background: theme.fill.tertiary,
                  }}
                >
                  <Row align="center">
                    <Text weight="semibold">Рис отварной</Text>
                    <Spacer />
                    <Pill active>безопасно</Pill>
                  </Row>
                  <Text size="small" style={{ marginTop: 8 }}>
                    {verdict}
                  </Text>
                  <div style={{ marginTop: 10 }}>
                    <Pill active>Сохранить в безопасные</Pill>
                  </div>
                </div>
              ) : null}

              {view === "error" ? (
                <div
                  style={{
                    border: `1px solid ${theme.stroke.primary}`,
                    borderRadius: 10,
                    padding: 14,
                    background: theme.bg.elevated,
                    textAlign: "center",
                  }}
                >
                  <Text weight="semibold">{errorTitle}</Text>
                  <Text size="small" tone="secondary" style={{ marginTop: 6 }}>
                    Проверьте ввод или повторите скан.
                  </Text>
                  <div style={{ marginTop: 10 }}>
                    <Pill active>Повторить</Pill>
                  </div>
                </div>
              ) : null}

              {view === "default" ? (
                <Stack gap={10}>
                  <div
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 10,
                      padding: 10,
                      background: theme.bg.elevated,
                    }}
                  >
                    <Text size="small" weight="semibold">
                      Скан этикетки
                    </Text>
                    <Text size="small" tone="secondary">
                      Фото состава или штрихкода
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Pill active>{openCta}</Pill>
                    </div>
                  </div>

                  <Text size="small" tone="tertiary">
                    или введите вручную
                  </Text>

                  <div
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 8,
                      padding: 10,
                      background: theme.bg.elevated,
                      minHeight: 72,
                    }}
                  >
                    <Text size="small">{manual}</Text>
                  </div>

                  <div
                    style={{
                      background: theme.fill.primary,
                      color: theme.text.onAccent,
                      borderRadius: 10,
                      padding: 12,
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    {checkCta}
                  </div>

                  <div
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 10,
                      padding: 10,
                      background: theme.bg.elevated,
                    }}
                  >
                    <Text size="small" tone="tertiary" weight="semibold">
                      ScanHistory
                    </Text>
                    <Text size="small" style={{ marginTop: 6 }}>
                      Йогурт · опасно
                    </Text>
                    <Text size="small" tone="secondary" style={{ marginTop: 4 }}>
                      Рис · безопасно
                    </Text>
                  </div>
                </Stack>
              ) : null}
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
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Home
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Diary
            </Text>
            <Text
              size="small"
              weight="semibold"
              tone="secondary"
              style={{ textAlign: "center" }}
            >
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
