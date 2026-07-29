import {
  Button,
  Callout,
  Divider,
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

export default function MockupSosCanvas() {
  const theme = useHostTheme();
  const dispatch = useCanvasAction();
  const [view, setView] = useCanvasState<ViewState>("sos-view", "default");
  const [eyebrow, setEyebrow] = useCanvasState("sos-eyebrow", "A-Claro · SOS");
  const [title, setTitle] = useCanvasState("sos-title", "SOS");
  const [subtitle, setSubtitle] = useCanvasState(
    "sos-subtitle",
    "Экстренная информация",
  );
  const [callCta, setCallCta] = useCanvasState("sos-call", "Позвонить 103");
  const [contactName, setContactName] = useCanvasState("sos-contact", "Анна · мама");
  const [editLabel, setEditLabel] = useCanvasState("sos-edit", "Изменить");
  const [emptyTitle, setEmptyTitle] = useCanvasState("sos-empty-title", "Нет профиля");
  const [emptyBody, setEmptyBody] = useCanvasState(
    "sos-empty-body",
    "Создайте профиль, чтобы заполнить SOS-паспорт и контакты.",
  );
  const [emptyCta, setEmptyCta] = useCanvasState("sos-empty-cta", "Создать профиль");

  return (
    <Stack gap={16}>
      <Row align="center">
        <H1>Mockup · SOS</H1>
        <Spacer />
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "docs/screens/sos.html" })
          }
        >
          HTML
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "openFile", path: "apps/mobile/app/(tabs)/sos.tsx" })
          }
        >
          TSX
        </Button>
      </Row>
      <Text tone="secondary">
        As-is from `app/(tabs)/sos.tsx`. Edit fields → preview updates. Route
        `/(tabs)/sos`.
      </Text>
      <Callout tone="info" title="data-component map">
        SosEmergencyBar (pinned) · ScreenHeader · ProfileSwitcher · ProfileKpiCard ·
        ContactsCard · EmptyState · Disclaimer
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
          empty profile
        </Button>
      </Row>

      <Row gap={16} align="start" wrap>
        <Stack gap={10} style={{ minWidth: 280, flex: 1 }}>
          <Text weight="semibold">Editable copy</Text>
          <TextInput value={eyebrow} onChange={setEyebrow} placeholder="Eyebrow" />
          <TextInput value={title} onChange={setTitle} placeholder="Title" />
          <TextInput value={subtitle} onChange={setSubtitle} placeholder="Subtitle" />
          <TextInput value={callCta} onChange={setCallCta} placeholder="Call CTA" />
          <TextInput
            value={contactName}
            onChange={setContactName}
            placeholder="Contact"
          />
          <TextInput value={editLabel} onChange={setEditLabel} placeholder="Edit" />
          <Divider />
          <Text size="small" tone="tertiary">
            Empty state
          </Text>
          <TextInput value={emptyTitle} onChange={setEmptyTitle} />
          <TextInput value={emptyBody} onChange={setEmptyBody} />
          <TextInput value={emptyCta} onChange={setEmptyCta} />
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
              SOS
            </Text>
            <Text size="small" tone="tertiary">
              LTE
            </Text>
          </div>

          {view === "default" ? (
            <div style={{ padding: 12 }}>
              <Stack gap={10}>
                <div
                  style={{
                    background: theme.fill.primary,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text size="small" tone="tertiary" weight="semibold">
                    SosEmergencyBar
                  </Text>
                  <div
                    style={{
                      marginTop: 8,
                      background: theme.bg.elevated,
                      color: theme.text.primary,
                      borderRadius: 8,
                      padding: 12,
                      textAlign: "center",
                      fontWeight: 700,
                    }}
                  >
                    {callCta}
                  </div>
                  <Row align="center" style={{ marginTop: 8 }}>
                    <Text size="small" style={{ color: theme.text.onAccent }}>
                      {contactName}
                    </Text>
                    <Spacer />
                    <Pill active>Позвонить</Pill>
                  </Row>
                </div>

                <Row align="start">
                  <Stack gap={2} style={{ flex: 1 }}>
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
                  <Pill>{editLabel}</Pill>
                </Row>

                <Row gap={6}>
                  <Pill active>Маша</Pill>
                  <Pill>Папа</Pill>
                </Row>

                <div
                  style={{
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 10,
                    padding: 10,
                    background: theme.bg.elevated,
                  }}
                >
                  <Text size="small" tone="tertiary" weight="semibold">
                    ProfileKpiCard
                  </Text>
                  <Row gap={8} style={{ marginTop: 8 }}>
                    <Text size="small" weight="semibold">
                      Маша
                    </Text>
                    <Text size="small" tone="secondary">
                      8 лет
                    </Text>
                  </Row>
                  <Row gap={6} style={{ marginTop: 8 }} wrap>
                    <Pill>молоко</Pill>
                    <Pill>арахис</Pill>
                    <Pill>берёза</Pill>
                  </Row>
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
                    ContactsCard
                  </Text>
                  <Text size="small" style={{ marginTop: 6 }}>
                    {contactName}
                  </Text>
                  <Text size="small" tone="secondary">
                    +7 900 000-00-00
                  </Text>
                </div>

                <Text size="small" tone="tertiary">
                  Disclaimer · не заменяет врача
                </Text>
              </Stack>
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              <Stack gap={10}>
                <Text size="small" tone="tertiary" weight="semibold">
                  {eyebrow}
                </Text>
                <Text weight="bold" style={{ fontSize: 24 }}>
                  {title}
                </Text>
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
                    {emptyBody}
                  </Text>
                  <div style={{ marginTop: 12 }}>
                    <Pill active>{emptyCta}</Pill>
                  </div>
                </div>
              </Stack>
            </div>
          )}

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
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Scan
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Market
            </Text>
            <Text size="small" tone="tertiary" style={{ textAlign: "center" }}>
              Map
            </Text>
            <Text
              size="small"
              weight="semibold"
              tone="secondary"
              style={{ textAlign: "center" }}
            >
              SOS
            </Text>
          </div>
        </div>
      </Row>
    </Stack>
  );
}
