

```markdown
# Todo App Implementation Checklist

## APP PHILOSOPHY & DESIGN PRINCIPLES

### Core Concept
This is a **Getting Things Done (GTD) inspired task manager** that combines multiple productivity frameworks:
- **GTD methodology**: Inbox for capture, lists for organization, projects for multi-step outcomes
- **Eisenhower Matrix**: Quadrant-based prioritization (urgent/important)
- **Maslow's Hierarchy**: Holistic life balance tracking across fundamental human needs
- **Time-blocking**: Morning warmup, focused work day, evening cooldown rhythm

### Key Philosophy Points

**Capture Everything, Process Later**
- Quick inbox entry removes friction from capturing tasks
- One button press, type title, done - back to what you were doing
- Processing (adding details, categorizing) happens separately in dedicated time

**Today is Sacred**
- "Today" view is the daily focus point
- Smart tabs guide you through the day: Morning → Today → Cooldown → Fun
- Time progress bar prevents overcommitting
- Visual feedback shows if you're overloaded before you start

**Repeating Rituals Matter**
- Morning warmup tasks prepare you for the day (exercise, meditation, review)
- Evening cooldown tasks wind you down (journaling, planning tomorrow, shutdown ritual)
- These reset daily but track completion history for streaks/patterns

**Context-Aware Navigation**
- App defaults to what you need NOW based on time and completion status
- Morning incomplete? Show morning tab
- Past cooldown time? Show cooldown tab
- Everything done and time to relax? Show fun tasks
- The app meets you where you are

**Hierarchy Without Overwhelm**
- Desktop: Miller columns let you drill down naturally (project → tasks → subtasks)
- Mobile: Indentation shows hierarchy without losing vertical space
- You can zoom in (focus on one project) or zoom out (see everything) as needed

**Intentional Prioritization**
- Quadrants force "is this REALLY urgent?" thinking
- Maslow categories prompt "am I neglecting physical health? relationships?"
- These aren't just metadata - they're reflection tools

**Offline-First, Privacy-First**
- All data stays on your device
- No account required, no sync (initially)
- Your tasks, your data, your device

**Responsive, Not Compromised**
- Mobile isn't a "limited version" - it prioritizes speed of ticking tasks off
- Desktop isn't "bloated" - it prioritizes deep organization and editing
- Same data, optimized UX for each context

### User Flow Examples

**Morning Routine:**
1. Open app → Auto-shows Morning tab (warmup tasks)
2. Check off morning tasks (meditation, exercise, email review)
3. App switches to Today tab → See flagged tasks
4. Time progress shows: "3h until cooldown, 2h of tasks" → green (manageable)
5. Work through tasks, checking them off
6. Throughout day: quick add to inbox when ideas pop up

**Inbox Processing:**
1. Open Inbox view (shows all captured tasks)
2. For each task: "Is this a project or a task?"
   - If project: Create project, convert to first task
   - If task: Add to appropriate list, set quadrant, add details
   - If reference: Add to context notes, complete task
   - If trash: Delete
3. Goal: Inbox at zero

**Evening Routine:**
1. Past cooldown time → App auto-shows Cooldown tab
2. Check off cooldown tasks (journal, review day, plan tomorrow)
3. After cooldown complete → App shows Fun tab (leisure tasks flagged for tonight)
4. Relax guilt-free - you've done your warmup and cooldown

---

## DATABASE LAYER
- [x] Install dependencies (better-sqlite3, @capacitor-community/sqlite, sql.js) ✅
- [x] Create `src/db/types.ts` - Database interface ✅
- [x] Create `src/db/schema.ts` - SQL schema with all tables ✅
  - [x] settings table (wake_up_time, cooldown_time, sleep_time) ✅
  - [x] lists table (name, type, is_repeating, sort_order) ✅
  - [x] projects table (name, description, quadrant, maslow_category, maslow_subcategory, archived) ✅
  - [x] tasks table (title, description, context, duration_minutes, parent_task_id, project_id, list_id, flagged_for_today, is_repeating, quadrant, maslow_category, maslow_subcategory, sort_order) ✅
  - [x] task_completions table (task_id, completed_date) - for repeating tasks ✅
  - [x] tags table (name, color) ✅
  - [x] task_tags table (junction table) ✅
  - [x] All appropriate indexes ✅
- [x] Create `src/db/electron.ts` - better-sqlite3 implementation ✅
- [x] Create `src/db/capacitor.ts` - Capacitor SQLite implementation ✅
- [x] Create `src/db/web.ts` - sql.js + IndexedDB implementation ✅
- [x] Create `src/db/index.ts` - Factory with 3-way platform detection ✅
- [x] Verify auto-persistence works on all platforms ✅
- [x] Test database operations (CRUD) on all platforms ✅

**DATABASE LAYER: 100% COMPLETE** - Excellent cross-platform database layer with full schema and migrations.

## CORE DATA HOOKS
- [x] `useTasks(filters?)` - Get tasks with optional filtering ✅
- [x] `useTask(taskId)` - Get single task with all details ✅
- [x] `useProjects()` - Get all projects ✅
- [x] `useProject(projectId)` - Get single project with tasks ✅ **ADDED TODAY**
- [x] `useLists()` - Get all lists ✅
- [ ] `useTags()` - Get all tags
- [ ] `useSettings()` - Get/update app settings
- [ ] `useTodayTasks()` - Get tasks flagged for today
- [ ] `useMorningTasks()` - Get warmup repeating tasks
- [ ] `useCooldownTasks()` - Get cooldown repeating tasks
- [ ] `useTaskCompletions(taskId)` - Get completion history
- [ ] Mutations: addTask, updateTask, deleteTask, completeTask, flagTask
- [ ] Mutations: addProject, updateProject, deleteProject, archiveProject
- [ ] Mutations: addTag, updateTag, deleteTag
- [ ] Mutations: addList, updateList, deleteList
- [ ] Mutations: updateSettings

## UI REACTIVITY VERIFICATION

**Critical: Every data change must immediately update the UI without page refresh**

### Task Operations
- [ ] **Create task**: New task appears in appropriate list immediately
- [ ] **Update task title**: Title updates in all views where task is visible
- [ ] **Update task details**: Changes reflect in detail panel and list item
- [ ] **Complete task**: Checkbox updates, task styling changes (strikethrough/fade)
- [ ] **Uncomplete task**: Checkbox unchecks, styling reverts
- [ ] **Delete task**: Task disappears from all views immediately
- [ ] **Flag task for today**: Task appears in Today tab immediately
- [ ] **Unflag task**: Task disappears from Today tab immediately
- [ ] **Move task to project**: Task appears in project, disappears from old location
- [ ] **Move task to list**: Task appears in new list, disappears from old list
- [ ] **Nest task**: Task becomes subtask, indentation/hierarchy updates
- [ ] **Unnest task**: Task becomes top-level, hierarchy updates
- [ ] **Reorder task**: Visual order updates immediately (drag-drop or manual)
- [ ] **Add tag to task**: Tag badge appears on task item
- [ ] **Remove tag from task**: Tag badge disappears
- [ ] **Update duration**: Time progress bar recalculates if task is in Today
- [ ] **Change quadrant**: Visual indicator updates (color/badge)

### Project Operations
- [ ] **Create project**: Project appears in project list immediately
- [ ] **Update project name**: Name updates in sidebar and project list
- [ ] **Delete project**: Project disappears, tasks unassigned or deleted based on logic
- [ ] **Archive project**: Project moves to archived section or hidden
- [ ] **Unarchive project**: Project reappears in active projects
- [ ] **Assign task to project**: Task count on project increments

### List Operations
- [ ] **Create custom list**: List appears in sidebar/menu immediately
- [ ] **Update list name**: Name updates everywhere list is referenced
- [ ] **Delete list**: List disappears, tasks moved to inbox or unassigned
- [ ] **Assign task to list**: Task appears in list view

### Tag Operations
- [ ] **Create tag**: Tag appears in tag selector and tag list
- [ ] **Update tag name**: Name updates on all tasks with that tag
- [ ] **Update tag color**: Color updates on all task badges
- [ ] **Delete tag**: Tag removed from all tasks, disappears from selectors

### Today View Reactivity
- [ ] **Complete morning task**: Task completion updates, if all morning done → auto-switch to Today tab
- [ ] **Complete cooldown task**: Task completion updates, if all cooldown done → auto-switch to Fun tab
- [ ] **Time passes cooldown threshold**: App auto-switches to Cooldown tab (if not complete)
- [ ] **Flag task**: Task immediately appears in Today tab
- [ ] **Unflag task**: Task immediately disappears from Today tab
- [ ] **Complete today task**: Checkbox updates, duration recalculated in progress bar
- [ ] **Add new today task**: Duration added to progress bar, overload status updates
- [ ] **Time progress bar**: Updates in real-time or every minute (shows current time vs cooldown/bedtime)

### Inbox Reactivity
- [ ] **Quick add to inbox**: Task appears in inbox immediately
- [ ] **Process inbox item** (move/delete): Item disappears from inbox, count badge updates
- [ ] **Inbox count badge**: Updates whenever task added/removed from inbox

### Settings Reactivity
- [ ] **Change wake up time**: Saved immediately, no confirmation needed
- [ ] **Change cooldown time**: Time progress bar updates if in Today view
- [ ] **Change bedtime**: Time progress bar updates if in Today view
- [ ] **Change theme**: Theme switches immediately (light/dark)

### Repeating Tasks
- [ ] **Complete repeating task**: Checkbox updates, completion recorded for today
- [ ] **New day starts**: All repeating tasks reset to unchecked (morning/cooldown)
- [ ] **View completion history**: Shows all past completions by date

### Hierarchy & Navigation
- [ ] **Click project (desktop)**: Tasks appear in second column
- [ ] **Click task with subtasks (desktop)**: Subtasks appear in third column
- [ ] **Click task (mobile)**: Navigate to full-screen detail view
- [ ] **Back button (mobile)**: Return to previous view
- [ ] **Expand/collapse subtasks**: Children show/hide smoothly

### Multi-Column Navigation (Desktop)
- [ ] **Select item in column 1**: Column 2 updates with related content
- [ ] **Select item in column 2**: Column 3 updates with related content
- [ ] **Click task anywhere**: Detail panel slides in from right
- [ ] **Close detail panel**: Panel slides out, returns focus to list

### Loading States
- [ ] **Initial app load**: Shows loading spinner until database ready
- [ ] **Long query**: Shows skeleton/loading state in list
- [ ] **Saving changes**: Shows subtle saving indicator
- [ ] **Error state**: Shows error message with retry option

### Optimistic Updates
- [ ] **Check off task**: Checkbox updates immediately (optimistic), rollback if DB fails
- [ ] **Quick add**: Task appears immediately, confirmed after DB write
- [ ] **Reorder (drag-drop)**: Order changes immediately, persisted after drop

### Edge Cases
- [ ] **Delete parent task**: Subtasks handled correctly (deleted or orphaned based on logic)
- [ ] **Delete project with tasks**: Tasks handled correctly (unassigned or deleted)
- [ ] **Delete tag used by tasks**: Tag removed from all tasks
- [ ] **Invalid time input**: Validation shows error, doesn't save
- [ ] **Concurrent edits** (same task in detail panel and list): Most recent wins
- [ ] **Offline (web)**: Changes queue, show offline indicator (future enhancement)

### Performance Under Load
- [ ] **1000+ tasks**: Lists remain responsive (virtualization working)
- [ ] **Deep nesting** (10+ levels): Hierarchy renders correctly
- [ ] **Many tags** (100+): Tag selector remains usable (autocomplete/search)
- [ ] **Rapid clicking**: No double-creates or race conditions

---

## RESPONSIVE LAYOUT
- [ ] Create `src/components/Layout/AppShell.tsx` - Main container
- [ ] Implement responsive breakpoints (mobile <768px, desktop >1024px)
- [ ] Create `src/components/Layout/MobileLayout.tsx`
  - [ ] Hamburger menu button in header
  - [ ] Full-screen view area
  - [ ] Back navigation
- [ ] Create `src/components/Layout/DesktopLayout.tsx`
  - [ ] Persistent sidebar
  - [ ] Multi-column Miller columns area
  - [ ] Slide-out detail panel from right
- [ ] Create `src/components/Layout/Header.tsx`
  - [ ] App title/logo
  - [ ] Quick add inbox button (always visible)
- [ ] Create `src/components/Layout/Sidebar.tsx` (desktop)
  - [ ] Navigation: Today, Inbox, Lists, Projects, Tags, Settings
  - [ ] Active state highlighting
- [ ] Create `src/components/Layout/HamburgerMenu.tsx` (mobile)
  - [ ] Drawer from left
  - [ ] Same navigation items as sidebar
- [ ] Test responsive behavior at all breakpoints

## QUICK ADD INBOX
- [ ] Create `src/components/common/QuickAddButton.tsx`
  - [ ] Prominent "+" button in header
  - [ ] Always visible on all screen sizes
- [ ] Create `src/components/common/QuickAddDialog.tsx`
  - [ ] Modal/popover for quick entry
  - [ ] Single text field for task title
  - [ ] Enter to submit
  - [ ] Automatically adds to Inbox
  - [ ] Auto-focus on open
  - [ ] Close on submit or Escape
- [ ] Test quick add flow end-to-end
- [ ] **Reactivity check**: Task appears in inbox immediately after submit

## TODAY VIEW
- [ ] Create `src/components/Today/TodayView.tsx`
  - [ ] Tab navigation (Morning, Today, Cooldown, Fun)
  - [ ] Smart default tab selection logic
  - [ ] Render appropriate tab content
- [ ] Create `src/components/Today/useTodayTabLogic.ts` hook
  - [ ] Check if morning tasks complete
  - [ ] Check current time vs cooldown time
  - [ ] Check if cooldown tasks complete
  - [ ] Check current time vs bedtime
  - [ ] Return appropriate default tab
- [ ] Create `src/components/Today/TimeProgress.tsx`
  - [ ] Display time until cooldown
  - [ ] Display time until bedtime
  - [ ] Sum incomplete task durations
  - [ ] Compare available time vs task duration
  - [ ] Color-coded status (green/yellow/red)
  - [ ] Visual progress bar
- [ ] Create `src/components/Today/MorningTab.tsx`
  - [ ] Display warmup/morning repeating tasks
  - [ ] Check/uncheck functionality
  - [ ] Track in task_completions table by date
- [ ] Create `src/components/Today/TodayTab.tsx`
  - [ ] Display flagged tasks
  - [ ] Group/sort appropriately
- [ ] Create `src/components/Today/CooldownTab.tsx`
  - [ ] Display cooldown/evening repeating tasks
  - [ ] Check/uncheck functionality
  - [ ] Track in task_completions table by date
- [ ] Create `src/components/Today/FunTab.tsx`
  - [ ] Display tasks tagged #fun AND flagged
  - [ ] Only show after cooldown complete + before bedtime
- [ ] Test tab switching logic at different times of day
- [ ] Test repeating task completion tracking
- [ ] **Reactivity check**: Completing last morning task auto-switches to Today tab
- [ ] **Reactivity check**: Time passing cooldown threshold auto-switches tabs
- [ ] **Reactivity check**: Progress bar updates when tasks completed/added

## TASK COMPONENTS
- [ ] Create `src/components/Tasks/TaskList.tsx`
  - [ ] Render list of tasks
  - [ ] Support hierarchy display (indentation on mobile)
  - [ ] Virtualization for long lists (react-window or MUI)
  - [ ] Empty state
- [ ] Create `src/components/Tasks/TaskItem.tsx`
  - [ ] Checkbox for completion
  - [ ] Task title display
  - [ ] Visual indicators (flagged, has subtasks, duration)
  - [ ] Click to open detail
  - [ ] Responsive: indentation on mobile, column nav on desktop
  - [ ] Drag handle for reordering (if implementing drag-drop)
- [ ] Create `src/components/Tasks/TaskDetail.tsx`
  - [ ] Mobile: Full-screen view with back button
  - [ ] Desktop: Slide-out panel from right
  - [ ] Close button
  - [ ] Contains TaskForm
- [ ] Create `src/components/Tasks/TaskForm.tsx`
  - [ ] Text field: Title (required)
  - [ ] Text field: Description
  - [ ] Text area: Context (long-form notes)
  - [ ] Number field: Duration (minutes)
  - [ ] Select: Project
  - [ ] Select: List
  - [ ] Checkbox: Flag for today
  - [ ] Checkbox: Is repeating (for custom repeating tasks)
  - [ ] Select: Quadrant (Q1/Q2/Q3/Q4)
  - [ ] Select: Maslow category
  - [ ] Select: Maslow subcategory (based on category)
  - [ ] Tag selector (multi-select with autocomplete)
  - [ ] Display parent task (if subtask)
  - [ ] Button to change parent / unnest
  - [ ] List of subtasks (if has children)
  - [ ] Button to add subtask
  - [ ] Auto-save on changes (debounced)
  - [ ] Delete button
- [ ] Test task CRUD operations
- [ ] Test task hierarchy (nest/unnest)
- [ ] **Reactivity check**: All form changes reflect in list view without closing panel

## PROJECT COMPONENTS
- [ ] Create `src/components/Projects/ProjectList.tsx`
  - [ ] Display all projects
  - [ ] Show task count per project
  - [ ] Click to view project tasks
  - [ ] Button to create new project
  - [ ] Show archived projects separately (optional)
- [ ] Create `src/components/Projects/ProjectItem.tsx`
  - [ ] Project name
  - [ ] Visual indicators (task count, quadrant, etc.)
  - [ ] Click to navigate to project tasks
- [ ] Create `src/components/Projects/ProjectDetail.tsx` (optional)
  - [ ] Edit project details
  - [ ] View all tasks in project
  - [ ] Delete/archive project
- [ ] Test project creation and task assignment
- [ ] **Reactivity check**: Creating project shows it immediately
- [ ] **Reactivity check**: Task count updates when tasks added/removed

## LISTS & INBOX
- [ ] Create `src/components/Lists/ListView.tsx`
  - [ ] Display all lists (Warmup, Cooldown, Inbox, Custom)
  - [ ] Click to view list tasks
  - [ ] Button to create custom list
- [ ] Create `src/components/Inbox/InboxView.tsx`
  - [ ] Display inbox tasks
  - [ ] Process inbox (move to project/list, add details)
  - [ ] Quick actions: flag, delete, complete
  - [ ] Inbox count badge
- [ ] **Reactivity check**: Inbox count badge updates in real-time

## TAGS
- [ ] Create `src/components/Tags/TagView.tsx`
  - [ ] Display all tags with colors
  - [ ] Click tag to filter tasks
  - [ ] Create new tag
  - [ ] Edit/delete tags
- [ ] Create `src/components/Tags/TagSelector.tsx`
  - [ ] Multi-select component
  - [ ] Autocomplete
  - [ ] Create tag inline
  - [ ] Color badges
- [ ] Test tag creation and filtering
- [ ] **Reactivity check**: Creating tag shows it in selector immediately

## SETTINGS
- [ ] Create `src/components/Settings/SettingsView.tsx`
  - [ ] Time settings section
    - [ ] Wake up time picker
    - [ ] Cooldown time picker
    - [ ] Bedtime picker
  - [ ] Theme toggle (light/dark)
  - [ ] Data management section
    - [ ] Export data button
    - [ ] Import data button
    - [ ] Clear all data button (with confirmation)
- [ ] Test settings persistence
- [ ] **Reactivity check**: Time changes update Today view immediately

## DRAG AND DROP (Optional but nice)
- [ ] Install drag-drop library (dnd-kit or pragmatic-drag-and-drop)
- [ ] Implement task reordering within lists
- [ ] Implement task reordering within projects
- [ ] Implement moving tasks between lists/projects
- [ ] Visual feedback during drag
- [ ] Test on mobile (touch) and desktop (mouse)
- [ ] **Reactivity check**: Drag-drop order changes persist and reflect immediately

## VIEW TRANSITIONS API
- [ ] Create `src/hooks/useViewTransition.ts`
  - [ ] Feature detection
  - [ ] Wrapper function with fallback
- [ ] Apply to tab switching (Today view)
- [ ] Apply to column navigation (desktop)
- [ ] Apply to detail panel open/close
- [ ] Apply to mobile navigation stack
- [ ] Test with and without browser support

## MASLOW'S HIERARCHY
- [ ] Define Maslow categories as constants
  - [ ] Physiological (food, water, sleep, shelter)
  - [ ] Safety (security, health, financial stability)
  - [ ] Love/Belonging (relationships, friendship, intimacy)
  - [ ] Esteem (achievement, respect, confidence)
  - [ ] Self-Actualization (creativity, problem-solving, purpose)
- [ ] Define subcategories for each
- [ ] Implement category selector in TaskForm
- [ ] Implement subcategory selector (filtered by category)
- [ ] Display in task list (visual indicator/badge)

## QUADRANT (EISENHOWER MATRIX)
- [ ] Implement Q1/Q2/Q3/Q4 selector in TaskForm
  - [ ] Q1: Urgent & Important
  - [ ] Q2: Not Urgent & Important
  - [ ] Q3: Urgent & Not Important
  - [ ] Q4: Not Urgent & Not Important
- [ ] Color coding for quadrants
- [ ] Filter/sort by quadrant
- [ ] Display in task list (visual indicator/badge)

## POLISH & UX
- [ ] Loading states for all async operations
- [ ] Error handling and user feedback (toasts/snackbars)
- [ ] Empty states for lists, projects, tags
- [ ] Confirmation dialogs for destructive actions
- [ ] Smooth animations/transitions
- [ ] Keyboard shortcuts (desktop - optional)
  - [ ] Ctrl/Cmd+N: Quick add
  - [ ] Ctrl/Cmd+Enter: Complete task
  - [ ] Escape: Close panels/modals
- [ ] Focus management (especially in modals/panels)
- [ ] Loading spinners
- [ ] Optimistic updates where appropriate

## ACCESSIBILITY
- [ ] Semantic HTML
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation support
- [ ] Focus indicators
- [ ] Screen reader testing
- [ ] Sufficient color contrast

## TESTING & VERIFICATION
- [ ] Test on Electron (Linux desktop)
- [ ] Test on Capacitor (Android mobile)
- [ ] Test on Web browser (Chrome, Firefox)
- [ ] Test responsive breakpoints (resize window)
- [ ] Test data persistence across app restarts
- [ ] Test with large dataset (many tasks/projects)
- [ ] Test repeating task logic (morning/cooldown reset daily)
- [ ] Test Today tab switching at different times
- [ ] Test time progress calculation
- [ ] Test task hierarchy (deep nesting)
- [ ] Test drag-and-drop (if implemented)
- [ ] Test View Transitions (if supported browser)

## BUILD & DEPLOYMENT
- [ ] Configure Electron build (electron-builder)
  - [ ] AppImage output for Linux
  - [ ] Test AppImage on Linux
- [ ] Configure Capacitor build
  - [ ] Android APK generation
  - [ ] Test APK on Android device/emulator
- [ ] Configure web build
  - [ ] Optimize for production
  - [ ] Test deployed web version
- [ ] Create build scripts in package.json

## DOCUMENTATION
- [ ] Update README with:
  - [ ] Project description
  - [ ] Tech stack
  - [ ] Installation instructions
  - [ ] Development setup
  - [ ] Build instructions (all platforms)
  - [ ] Architecture overview
- [ ] Add code comments for complex logic
- [ ] Document database schema
```

This now includes the app philosophy at the top and comprehensive UI reactivity checks throughout. The philosophy section explains the "why" behind design decisions, and the reactivity checks ensure the app feels responsive and immediate!