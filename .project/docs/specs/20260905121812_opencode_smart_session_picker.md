---
title: Plugin picker de sessões do OpenCode
status: done
created: 2026-09-05
updated: 2026-09-05
owner: "@oporpino"
certainty: high
---

# Plugin picker de sessões do OpenCode

> **TLDR**: um plugin TUI (`@br4zz4/opencode-smart-session-picker`) que abre um picker listando todas as sessões do OpenCode de todos os projetos, exibindo nome do projeto + sessão + data/hora, e navega para a sessão escolhida.

## Contexto

O picker de sessões nativo (`Ctrl+x l`) lista sessões do projeto atual apenas. Quando o usuário trabalha em múltiplos repositórios, não existe uma forma rápida de ver e pular para sessões de outros projetos partindo de dentro do TUI. Este plugin resolve isso listando sessões **de todos os projetos** com o nome do projeto à esquerda de cada linha.

## Objetivos

- Abrir um picker de sessões via slash command (`/sessions`) e keybinding.
- Listar todas as sessões não-arquivadas de **todos os projetos**, excluindo subagents (sessões filhas).
- Cada item mostra: nome do projeto + título da sessão + data/hora (formato brasileiro `DD/MM/AAAA HH:MM`).
- Agrupar visualmente por projeto (headers de seção), ordenando por data de update decrescente dentro de cada projeto.
- Ao selecionar, navegar (`api.route.navigate("session", { sessionID })`).
- Sobrescrever o keybinding nativo do picker de sessões se possível; senão, usar um novo keybinding dedicado.

## Fora de escopo

- Não deleta, renomeia, arquiva ou cria sessões.
- Não expõe conteúdo/token/custo das sessões.
- Não mostra sessões arquivadas nem sessões filhas (subagents).
- Não é um server plugin; apenas TUI.

## Mudanças

Arquivos a criar em `opencode-smart-session-picker/`:

- `package.json` — name `@br4zz4/opencode-smart-session-picker`, author `oporpino <dev@porpi.no>`, license AGPL-3.0, `exports["./tui"]` → `./dist/index.js`.
- `build.mjs` — esbuild bundle `src/index.tsx` → `dist/index.js` (ESM, jsx automatic, `jsxImportSource: "@opentui/solid"`, external `@opentui/solid/jsx-runtime`, `@opencode-ai/plugin`).
- `tsconfig.json` — strict TS, `moduleResolution: bundler`, `jsxImportSource: "@opentui/solid"`.
- `src/index.tsx` — implementação do plugin (ver abaixo).
- `.gitignore` — `node_modules/`.
- `LICENSE` — AGPL-3.0, `Copyright (C) 2026 oporpino <dev@porpi.no>`.
- `.project/docs/specs/20260905121812_opencode_smart_session_picker.md` — este documento.

### Implementação (`src/index.tsx`)

- Importa tipos de `@opencode-ai/plugin/tui` (`TuiPlugin`, `TuiDialogSelectOption`) e `@opencode-ai/sdk/v2` (`Session`, `Project`).
- No `tui(api)`:
  1. Registra comando `session.list` via `api.command.register` com `slash: { name: "sessions", aliases: ["resume", "continue"] }` — o mesmo `name` do comando nativo, então `/sessions`, `/resume` e `/continue` passam a disparar o picker do plugin (override do comando nativo).
  2. Registra keybindings via `api.keymap.registerLayer({ bindings: [...] })`: `<leader>l` (sobrescreve `Ctrl+x l` nativo) e `ctrl+o` (dedicado).
  3. `openPicker()`:
     - Carrega sessões com `api.client.experimental.session.list({ limit: 1000, roots: true, directory: "" })` (o `directory: ""` impede o client do SDK de injetar o diretório atual, então a lista cobre **todas** as pastas) e projetos com `api.client.project.list({})`.
     - Filtra: `time.archived` ausente/undefined e `parentID` ausente/undefined.
     - Monta mapa `projectID → Project`; nome do projeto = `project.name` ou último componente de `project.worktree`; fallback para último componente de `session.directory`; último fallback `projectID` truncado.
     - Agrupa por projeto, ordena projetos alfabeticamente (`localeCompare` pt-BR) e sessões por `time.updated` desc dentro de cada projeto.
     - Renderiza `api.ui.DialogSelect` com opções `{ title: "projeto │ titulo  DD/MM/AAAA HH:MM", value: sessionID, category: projeto }` (o `category` gera headers de seção).
     - `onSelect` → `api.ui.dialog.clear()` + `api.route.navigate("session", { sessionID: option.value })`.
     - Vazio → toast warning "Nenhuma sessão encontrada".

### Descoberta importante (cross-project)

O client do SDK (`createOpencodeClient`) injeta o diretório atual como query param `directory` em toda requisição GET (`@opencode-ai/sdk/dist/v2/client.js`), e o servidor filtra `session.list`/`/experimental/session` por esse diretório. Para listar sessões de **todas** as pastas é obrigatório passar `directory: ""` como query param próprio — o SDK pula a injeção quando o param já existe e o servidor trata string vazia como "sem filtro".

### Edge cases

- `project.list()` falha → usa `session.directory` (último componente) como nome do projeto.
- Projeto não encontrado no mapa → fallback para `projectID` truncado.
- Lista vazia → toast, não abre dialog.
- Resposta da API pode vir como `{ data, error, response }` ou array direto → normalizar com `result?.data ?? result`.

## Como verificar

1. `npm run build` → gera `dist/index.js` sem erro.
2. `npm run typecheck` → `tsc --noEmit` limpo.
3. Instalar localmente via `file://.../dist/index.js` no `~/.config/opencode/tui.json`.
4. Reiniciar opencode; digitar `/sessions` → picker abre listando sessões de todos os projetos com nome do projeto à esquerda (verificado: 20 projetos, 137 sessões).
5. Selecionar uma sessão de outro projeto → navega para ela (verificado: sessão `.config/opencode` navegou para `~/.config/opencode`).
6. `Ctrl+x l` e `Ctrl+o` abrem o mesmo picker.
7. Confirmar que subagents e sessões arquivadas não aparecem.

## Documentação

`README.md` na raiz do repo do plugin (instalação, uso, keybinding).