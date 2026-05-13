## Why

The project uses mixed icon libraries (Ant Design Icons in Settings.jsx, Lucide elsewhere) and has both antd components and Radix UI primitives. This inconsistency creates visual mismatches and couples the app to antd's component ecosystem unnecessarily. We want flexibility to choose components freely.

## What Changes

- Replace Settings.jsx antd components (Radio, Switch, Select, Card) with custom alternatives
- Replace Ant Design Icons with Lucide equivalents (Folder, HelpCircle)
- Remove `antd` and `@ant-design/icons` dependencies from web/
- Keep using Lucide for all icons and Radix UI for existing components

## Non-goals

- Not migrating other pages/components that use antd (if any)
- Not adding new internationalization functionality

## Capabilities

### New Capabilities

- `icon-unification`: Replace all Ant Design Icons with Lucide equivalents
- `settings-component-replacement`: Replace antd components in Settings.jsx with custom/styled alternatives

### Modified Capabilities

- None

## Impact

- Remove `antd` package from web/
- Update `Settings.jsx` to use custom components and Lucide icons
- Future code should only use Lucide for icons