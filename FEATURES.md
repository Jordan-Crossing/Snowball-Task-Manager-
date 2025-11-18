# Snowball Task Manager - Feature Summary

## 🎯 Completed Features (Latest Session)

### 1. Auto-Adjust Parent Duration
**Location:** `src/utils/taskDuration.ts`, integrated into `App.tsx`

**Behavior:**
- When a task's duration is updated, the system automatically checks if the parent task duration needs adjustment
- If child tasks' total duration exceeds the parent, the parent is automatically expanded
- This adjustment cascades up the entire hierarchy recursively
- No warnings - just automatic smart adjustment

**Triggers:**
- When task duration is changed via TaskDetail editor
- When a task is moved to become a subtask (drag-and-drop)
- When creating new subtasks

**Code:**
```typescript
await triggerDurationAdjustment(db, taskId);
```

---

### 2. Task Reordering via Drag-and-Drop
**Location:** `src/components/Tasks/TaskItem.tsx`, `TaskList.tsx`

**Behavior:**
- **Drop on top edge** → Insert task BEFORE target
- **Drop on bottom edge** → Insert task AFTER target
- **Drop on center** → Make task a SUBTASK of target (existing behavior)

**Visual Feedback:**
- Top edge: Blue top border
- Bottom edge: Blue bottom border
- Center: Dashed blue border (make subtask)

**Features:**
- Edge detection using `@atlaskit/pragmatic-drag-and-drop-hitbox`
- Maintains hierarchy (only reorders within sibling group)
- Auto-recalculates sort_order for all affected tasks
- Smooth animations and transitions

---

### 3. Cross-Project Drag-and-Drop
**Location:** `src/components/Layout/Sidebar.tsx`

**Behavior:**
- Drag any task from the main view
- Drop onto a project in the sidebar
- Task is instantly reassigned to that project

**Visual Feedback:**
- Light blue background on hover
- Blue left border indicator
- Smooth 0.2s transition

**Implementation:**
- Projects in sidebar are drop targets
- Type checking: only accepts tasks (not other projects)
- Instant database update and refresh
- Works on desktop layout

---

## 🎨 Enhanced UI Features

### Task Preview (Two-Line Display)
**Location:** `src/components/Tasks/TaskItem.tsx`

**Shows:**
- **Line 1:** Task title with completion strike-through
- **Line 2:** Description preview + metadata badges
  - ⏱️ Duration chip (formatted as "1w 3d 2h 30m")
  - 🎯 Eisenhower Quadrant badge (Q1-Q4 with colors)
  - 🏔️ Maslow category badge with emoji

---

### Project Detail View with Inline Editing
**Location:** `src/components/Projects/ProjectDetailView.tsx`

**Features:**
- Hierarchical breadcrumb navigation
- Click-to-edit for all fields:
  - Project name
  - Description (multi-line)
  - Duration (custom format: "1w3d2h32m")
  - Eisenhower Quadrant (dropdown)
  - Maslow Category (dropdown)
- Total duration counter (shows all tasks + subtasks)
- Displays as work days: "2d 4h" (based on 8hr workday)
- Sub-projects list with navigation
- Tasks list with full hierarchy

**Keyboard Shortcuts:**
- `Enter` - Save edit
- `Escape` - Cancel edit
- Check/X buttons for mouse users

---

### Duration Parser
**Location:** `src/utils/duration.ts`

**Format:** `1w3d2h32m` (weeks, days, hours, minutes)

**Functions:**
```typescript
parseDuration("1w3d2h32m") → 11,672 minutes
formatDuration(11672) → "1w 3d 2h 32m"
formatAsWorkDays(11672) → "14d 5h" (based on 8hr workday)
isValidDuration("1w3d") → true
```

**Conversions:**
- 1 week = 10,080 minutes (7 × 24 × 60)
- 1 day = 1,440 minutes (24 × 60)
- 1 hour = 60 minutes

---

## 🗄️ Database Schema Updates

### Projects Table
```sql
parent_project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
is_folder BOOLEAN NOT NULL DEFAULT 0
duration_minutes INTEGER DEFAULT 0
```

### Tasks Table
```sql
parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE
is_folder BOOLEAN NOT NULL DEFAULT 0
duration_minutes INTEGER
```

---

## 🎯 Drag-and-Drop Summary

### Task → Task
1. **Top/Bottom Edge** → Reorder (insert before/after)
2. **Center** → Make subtask
3. **Circular check** → Prevents invalid parent-child relationships

### Task → Project (Sidebar)
- Drag task onto sidebar project
- Instant project reassignment
- Visual highlight feedback

---

## 🧪 Testing Checklist

### Auto-Adjust Duration
- [ ] Create parent task with 1h duration
- [ ] Add subtask with 2h duration
- [ ] Verify parent auto-expands to 2h
- [ ] Add another subtask with 1h
- [ ] Verify parent auto-expands to 3h
- [ ] Test multi-level hierarchy (grandparent adjustment)

### Task Reordering
- [ ] Create 3 sibling tasks
- [ ] Drag middle task to top edge of bottom task
- [ ] Verify order changes correctly
- [ ] Drag to bottom edge
- [ ] Verify insertion after target
- [ ] Drag to center → verify becomes subtask

### Cross-Project Moves
- [ ] Create project "Work"
- [ ] Create task in Inbox
- [ ] Drag inbox task onto "Work" in sidebar
- [ ] Verify task now shows in Work project
- [ ] Check task detail shows correct project

### Inline Editing
- [ ] Click project name → edit → save
- [ ] Click duration → enter "1w3d" → save
- [ ] Verify total duration updates with tasks
- [ ] Click quadrant dropdown → select Q1
- [ ] Click Maslow dropdown → select Esteem

### Duration Formatting
- [ ] Enter "1w" → verify shows "1w"
- [ ] Enter "1w3d2h30m" → verify parsing
- [ ] Check total project time shows work days
- [ ] Verify task badges show duration correctly

---

## 📦 New Dependencies

```json
{
  "@atlaskit/pragmatic-drag-and-drop-hitbox": "^latest"
}
```

---

## 🚀 Next Steps (Future Enhancements)

1. **List-based drag-and-drop** - Drag tasks onto lists in sidebar
2. **Tag-based filtering** - Drag tasks onto tags to add tags
3. **Bulk operations** - Multi-select and bulk drag
4. **Mobile touch support** - Enhance drag-and-drop for touch devices
5. **Undo/Redo** - Action history for all operations
6. **Keyboard shortcuts** - Full keyboard navigation
7. **Dark mode** - Theme switching
8. **Data export** - JSON/CSV export functionality

---

## 🎉 Summary

This session added **professional-grade task management features**:
- ✅ Intelligent duration management (auto-adjust)
- ✅ Intuitive drag-and-drop UX (3 modes)
- ✅ Quick project reassignment (sidebar drops)
- ✅ Rich metadata display (two-line preview)
- ✅ Inline editing everywhere (click-to-edit)
- ✅ Human-friendly duration input ("1w3d2h32m")

The app now supports **complex hierarchical planning** with **minimal friction** and **smart automation**!
