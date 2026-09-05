// src/index.tsx
import { jsx } from "@opentui/solid/jsx-runtime";
var OPENCODE_BASE_MODE = "base";
var tui = async (api) => {
  const projectName = (session, projectMap) => {
    const project = session.projectID ? projectMap.get(session.projectID) : void 0;
    if (project?.name?.trim()) return project.name.trim();
    const worktree = project?.worktree?.replace(/\/+$/, "").split(/[\\/]/).pop();
    if (worktree) return worktree;
    const directory = session.directory?.replace(/\/+$/, "").split(/[\\/]/).pop();
    if (directory) return directory;
    return session.projectID ? session.projectID.slice(0, 8) : "unknown";
  };
  const formatDateTime = (ms) => {
    const date = new Date(ms);
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const openPicker = async () => {
    if (api.mode.current() !== OPENCODE_BASE_MODE) return;
    if (api.renderer.currentFocusedEditor === null) return;
    let sessions = [];
    let projects = [];
    try {
      const [sessionResult, projectResult] = await Promise.all([
        api.client.experimental.session.list({ limit: 1e3, roots: true, directory: "" }),
        api.client.project.list({})
      ]);
      sessions = sessionResult?.data ?? sessionResult ?? [];
      projects = projectResult?.data ?? projectResult ?? [];
    } catch {
      api.ui.toast({ message: "Could not load sessions", variant: "error" });
      return;
    }
    if (!Array.isArray(sessions) || !Array.isArray(projects)) return;
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const visible = sessions.filter((session) => !session.time?.archived && !session.parentID);
    if (visible.length === 0) {
      api.ui.toast({ message: "Nenhuma sess\xE3o encontrada", variant: "warning" });
      return;
    }
    const grouped = /* @__PURE__ */ new Map();
    for (const session of visible) {
      const name = projectName(session, projectMap);
      const list = grouped.get(name) ?? [];
      list.push(session);
      grouped.set(name, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => b.time.updated - a.time.updated);
    }
    const orderedProjects = [...grouped.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const options = orderedProjects.flatMap(
      (project) => grouped.get(project).map((session) => ({
        title: `${project}  ${formatDateTime(session.time.updated)}  \u2502  ${session.title}`,
        value: session.id,
        category: project
      }))
    );
    api.ui.dialog.setSize("xlarge");
    api.ui.dialog.replace(
      () => /* @__PURE__ */ jsx(
        api.ui.DialogSelect,
        {
          title: "Sessions",
          placeholder: "Search all sessions\u2026",
          options,
          onSelect: (option) => {
            api.ui.dialog.clear();
            api.route.navigate("session", { sessionID: option.value });
          }
        }
      ),
      () => {
      }
    );
  };
  api.command?.register(() => [
    {
      title: "Pick session",
      value: "session.list",
      description: "Switch to any session across all projects",
      category: "Smart Session Picker",
      slash: { name: "sessions", aliases: ["resume", "continue"] },
      onSelect: () => {
        void openPicker();
      }
    }
  ]);
  api.keymap.registerLayer({
    bindings: [
      { key: "<leader>l", desc: "Pick session", preventDefault: true, cmd: () => void openPicker() },
      { key: "ctrl+o", desc: "Pick session", preventDefault: true, cmd: () => void openPicker() }
    ]
  });
};
var index_default = { id: "smart-session-picker", tui };
export {
  index_default as default
};
