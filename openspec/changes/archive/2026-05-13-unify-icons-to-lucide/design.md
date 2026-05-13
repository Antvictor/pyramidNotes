## Context

The project uses mixed icon libraries and has both antd components and Radix UI primitives. Settings.jsx uses antd components (Radio, Switch, Select, Card) alongside Ant Design Icons. We want to standardize on Lucide for icons and give freedom to choose component libraries.

## Goals / Non-Goals

**Goals:**
- Replace all Ant Design Icons with Lucide equivalents
- Replace antd components in Settings.jsx with custom/styled alternatives
- Remove antd and @ant-design/icons dependencies from web/
- Ensure visual consistency with unified icon style

**Non-Goals:**
- Not migrating other pages/components (if any use antd)
- Not implementing i18n

## Decisions

### 1. Icon Library: Lucide React

**Decision**: Use Lucide React as the sole icon library.

**Rationale**: Already in use for new components (Sidebar, dialog, command). Provides consistent stroke-based icons, independent of component frameworks, and good customization options.

### 2. Component Strategy

**Decision**: Replace antd components in Settings.jsx with custom styled implementations.

**Rationale**: Gives full control over styling and removes antd coupling for this page.

| antd Component | Replacement Strategy |
|----------------|---------------------|
| Radio.Group + Radio.Button | Custom styled button group with onClick |
| Switch | Custom toggle switch using CSS |
| Select | Custom dropdown/select implementation |
| Card | Styled div with title |

### 3. Icon Mapping

| Ant Design Icon | Lucide Equivalent |
|-----------------|-------------------|
| `<FolderOutlined />` | `<Folder />` |
| `<QuestionCircleOutlined />` | `<HelpCircle />` |

## Risks / Trade-offs

- **Risk**: Custom components require more styling work
  - **Mitigation**: Use existing CSS variables and follow established patterns

## Open Questions

None.