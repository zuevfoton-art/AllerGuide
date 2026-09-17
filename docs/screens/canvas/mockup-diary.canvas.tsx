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

type ViewState = "default" | "empty";

export default function MockupDiaryCanvas() {
  const theme = useHostTheme();
  const dispatch = useCanvasAction();
  const [view, setView] = useCanvasState<ViewState>("diary-view", "default");
  const [eyebrow, setEyebrow] = useCanvasState(
    "diary-eyebrow",
    "A-Claro · Наблюдения",
  );
  const [title, setTitle] = useCanvasState("diary-title", "Дневник");
  const [subtitle, setSubtitle] = useCanvasState(
    "diary-subtitle",
    "Пошаговые записи наблюдений",
  );
  const [newEntry, setNewEntry] = useCanvasState(
    "diary-new",
    "+ Новая запись по шагам",
  );
  const [quickEntry, setQuickEntry] = useCanvasState(
    "diary-quick",
    "Быстрая запись",
  );
  const [actTitle, setActTitle] = useCanvasState(
    "diary-act",
    "Пора заполнить ACT",
  );
  const [emptyTitle, setEmptyTitle] = useCanvasState(
    "diary-empty-title",
    "Пока нет записей",
  );

  return (
    <Stack gap={16}>
      <Row align="center">
        <H1>Mockup · Diary</H1>
        <Spacer />
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "docs/screens/diary.html" })
          }
        >
          HTML
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "apps/mobile/app/(tabs)/diary.tsx" })
          }
        >
          TSX
        </Button>
      </Row>
      <Text tone="secondary">
        As-is from `app/(tabs)/diary.tsx`. Editors are overlays — not in scroll.
      </Text>
      <Callout tone="info" title="data-component map">
        ScreenHeader · ActPromptCard · NewEntryCta · QuickAddCard · HistoryList ·
        DiaryEditorModal (overlay) · EmptyState
      </Callout>

      <Row gap={8}>
        <Button
          variant={view === "default" ? "primary" : "secondary"}
          onClick={() => setView("default")}
        >
          default
        </Button>
        <Button
          variant={view === "empty" ? "primary" : "secondary"}
          onClick={() => setView("empty")}
        >
          empty history
        </Button>
      </Row>

      <Row gap={16} align="start" wrap>
        <Stack gap={10} style={{ minWidth: 280, flex: 1 }}>
          <Text weight="semibold">Editable copy</Text>
          <TextInput value={eyebrow} onChange={setEyebrow} />
          <TextInput value={title} onChange={setTitle} />
          <TextInput value={subtitle} onChange={setSubtitle} />
          <TextInput value={newEntry} onChange={setNewEntry} />
          <TextInput value={quickEntry} onChange={setQuickEntry} />
          <TextInput value={actTitle} onChange={setActTitle} />
          <TextInput value={emptyTitle} onChange={setEmptyTitle} />
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
              Diary
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
                <Text weight="bold" style={{ fontSize: 24 }}>
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

              {view === "default" ? (
                <div
                  style={{
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 10,
                    padding: 10,
                    background: theme.fill.tertiary,
                  }}
                >
                  <Row align="center">
                    <Text size="small" weight="semibold">
                      {actTitle}
                    </Text>
                    <Spacer />
                    <Pill active>Заполнить ACT</Pill>
                  </Row>
                </div>
              ) : null}

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
                {newEntry}
              </div>
              <div
                style={{
                  border: `1px solid ${theme.stroke.primary}`,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {quickEntry}
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
                  QuickAddCard
                </Text>
                <Row gap={6} wrap style={{ marginTop: 8 }}>
                  <Pill>Симптомы</Pill>
                  <Pill>Еда</Pill>
                  <Pill>Лекарства</Pill>
                  <Pill active>Шкала</Pill>
                </Row>
              </div>

              {view === "empty" ? (
                <div
                  style={{
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 10,
                    padding: 16,
                    background: theme.bg.elevated,
                    textAlign: "center",
                  }}
                >
                  <Text weight="semibold">{emptyTitle}</Text>
                  <Text size="small" tone="secondary" style={{ marginTop: 6 }}>
                    Добавьте первую запись симптомов, еды или лекарств.
                  </Text>
                </div>
              ) : (
                <div
                  style={{
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 10,
                    padding: 10,
                    background: theme.bg.elevated,
                  }}
                >
                  <Text size="small" tone="tertiary" weight="semibold">
                    HistoryList
                  </Text>
                  <Text size="small" style={{ marginTop: 8 }}>
                    Симптомы · сегодня 08:20
                  </Text>
                  <Text size="small" tone="secondary" style={{ marginTop: 6 }}>
                    Еда · вчера 09:10
                  </Text>
                </div>
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
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Home
            </Text>
            <Text
              size="small"
              weight="semibold"
              tone="secondary"
              style={{ textAlign: "center" }}
            >
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
