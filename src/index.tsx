import type { TuiPlugin, TuiDialogSelectOption } from "@opencode-ai/plugin/tui"
import type { Project, Session } from "@opencode-ai/sdk/v2"

const OPENCODE_BASE_MODE = "base"

const tui: TuiPlugin = async (api) => {
  const projectName = (session: Session, projectMap: Map<string, Project>): string => {
    const project = session.projectID ? projectMap.get(session.projectID) : undefined
    if (project?.name?.trim()) return project.name.trim()
    const worktree = project?.worktree?.replace(/\/+$/, "").split(/[\\/]/).pop()
    if (worktree) return worktree
    const directory = session.directory?.replace(/\/+$/, "").split(/[\\/]/).pop()
    if (directory) return directory
    return session.projectID ? session.projectID.slice(0, 8) : "unknown"
  }

  const formatDateTime = (ms: number): string => {
    const date = new Date(ms)
    const pad = (value: number) => String(value).padStart(2, "0")
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const openPicker = async () => {
    if (api.mode.current() !== OPENCODE_BASE_MODE) return
    if (api.renderer.currentFocusedEditor === null) return

    let sessions: Session[] = []
    let projects: Project[] = []
    try {
      const [sessionResult, projectResult] = await Promise.all([
        api.client.experimental.session.list({ limit: 1000, roots: true, directory: "" }),
        api.client.project.list({}),
      ])
      sessions = ((sessionResult?.data ?? sessionResult) as Session[]) ?? []
      projects = ((projectResult?.data ?? projectResult) as Project[]) ?? []
    } catch {
      api.ui.toast({ message: "Could not load sessions", variant: "error" })
      return
    }

    if (!Array.isArray(sessions) || !Array.isArray(projects)) return

    const projectMap = new Map<string, Project>(projects.map((project) => [project.id, project]))

    const visible = sessions.filter((session) => !session.time?.archived && !session.parentID)
    if (visible.length === 0) {
      api.ui.toast({ message: "Nenhuma sessão encontrada", variant: "warning" })
      return
    }

    const grouped = new Map<string, Session[]>()
    for (const session of visible) {
      const name = projectName(session, projectMap)
      const list = grouped.get(name) ?? []
      list.push(session)
      grouped.set(name, list)
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => b.time.updated - a.time.updated)
    }
    const orderedProjects = [...grouped.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"))

    const options: TuiDialogSelectOption<string>[] = orderedProjects.flatMap((project) =>
      grouped
        .get(project)!
        .map((session) => ({
          title: `${project}  ${formatDateTime(session.time.updated)}  │  ${session.title}`,
          value: session.id,
          category: project,
        })),
    )

    api.ui.dialog.setSize("xlarge")
    api.ui.dialog.replace(
      () => (
        <api.ui.DialogSelect<string>
          title="Sessions"
          placeholder="Search all sessions…"
          options={options}
          onSelect={(option) => {
            api.ui.dialog.clear()
            api.route.navigate("session", { sessionID: option.value })
          }}
        />
      ),
      () => {},
    )
  }

  api.command?.register(() => [
    {
      title: "Pick session",
      value: "session.list",
      description: "Switch to any session across all projects",
      category: "Smart Session Picker",
      slash: { name: "sessions", aliases: ["resume", "continue"] },
      onSelect: () => {
        void openPicker()
      },
    },
  ])

  api.keymap.registerLayer({
    bindings: [
      { key: "<leader>l", desc: "Pick session", preventDefault: true, cmd: () => void openPicker() },
      { key: "ctrl+o", desc: "Pick session", preventDefault: true, cmd: () => void openPicker() },
    ],
  })
}

export default { id: "smart-session-picker", tui }