import { useEffect, useState } from 'react'
import { Box, CircularProgress, CssBaseline, Drawer } from '@mui/material'
import { getDatabase, type Task, type Settings, type List, type Project } from './db'
import { AppShell, TodayView, TaskList, TaskDetail, QuickAddButton, SettingsView, ProjectDetail, TagsView, ProjectsView } from './components'
import { ThemeProvider } from './theme'
import { useStore } from './store/useStore'
import { triggerDurationAdjustment } from './utils/taskDuration'
import './App.css'

function AppContentInner() {
  // Local state for modal/dialog management
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  // Get all state and actions from Zustand store
  const {
    // Data state
    db,
    loading,
    dbInitialized,
    tasks,
    settings,
    lists,
    projects,
    tags,
    taskTags,
    completedToday,
    // Navigation state
    currentView,
    selectedTaskId,
    selectedProjectId,
    selectedTagId,
    // Actions
    setDb,
    setLoading,
    setDbInitialized,
    setTasks,
    setSettings,
    setLists,
    setProjects,
    setTags,
    setTaskTags,
    setCompletedToday,
    addCompletedTask,
    removeCompletedTask,
    selectTask,
    selectProject,
    selectTag,
  } = useStore()

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      try {
        const database = await getDatabase()
        setDb(database)
        setDbInitialized(true)

        // Load initial data
        const today = new Date().toISOString().split('T')[0]
        const [settingsData, listsData, projectsData, tasksData, completionsData, tagsData, taskTagsData] = await Promise.all([
          database.get<Settings>('SELECT * FROM settings WHERE id = 1'),
          database.all<List>('SELECT * FROM lists ORDER BY sort_order'),
          database.all<Project>('SELECT * FROM projects WHERE archived = 0 ORDER BY name'),
          database.all<Task>('SELECT * FROM tasks ORDER BY sort_order'),
          database.all<{ task_id: number }>('SELECT task_id FROM task_completions WHERE completed_date = ?', [today]),
          database.all<import('./db/types').Tag>('SELECT * FROM tags ORDER BY name'),
          database.all<import('./db/types').TaskTag>('SELECT task_id, tag_id FROM task_tags'),
        ])

        // Build taskTags map
        const taskTagsMap = new Map<number, number[]>()
        taskTagsData.forEach((tt) => {
          if (!taskTagsMap.has(tt.task_id)) {
            taskTagsMap.set(tt.task_id, [])
          }
          taskTagsMap.get(tt.task_id)!.push(tt.tag_id)
        })

        setSettings(settingsData || null)
        setLists(listsData)
        setProjects(projectsData)
        setTasks(tasksData)
        setTags(tagsData)
        setTaskTags(taskTagsMap)
        setCompletedToday(new Set(completionsData.map((c: { task_id: number }) => c.task_id)))
      } catch (error) {
        console.error('Failed to initialize database:', error)
      } finally {
        setLoading(false)
      }
    }

    initDb()
  }, [])

  // Check for day change and reset repeating tasks
  useEffect(() => {
    if (!db) return

    const checkDayChange = async () => {
      const today = new Date().toISOString().split('T')[0]
      const lastCheckDate = localStorage.getItem('lastCheckDate')

      if (lastCheckDate !== today) {
        // Day has changed - reload completedToday for the new day
        localStorage.setItem('lastCheckDate', today)

        try {
          const completionsData = await db.all<{ task_id: number }>(
            'SELECT task_id FROM task_completions WHERE completed_date = ?',
            [today]
          )
          setCompletedToday(new Set(completionsData.map(c => c.task_id)))
        } catch (error) {
          console.error('Failed to refresh completions for new day:', error)
        }
      }
    }

    // Check on mount
    checkDayChange()

    // Check every minute for day change
    const interval = setInterval(checkDayChange, 60000)
    return () => clearInterval(interval)
  }, [db, setCompletedToday])

  // Handlers
  const handleAddTask = async (title: string) => {
    if (!db) return

    try {
      // QuickAddButton always adds to inbox, no project association
      const inboxId = lists.find(l => l.type === 'inbox')?.id || 3;

      await db.run(
        'INSERT INTO tasks (title, list_id, project_id, sort_order) VALUES (?, ?, ?, ?)',
        [title, inboxId, null, tasks.length]
      )

      // Fetch updated tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  const handleToggleComplete = async (taskId: number) => {
    if (!db) return

    try {
      const today = new Date().toISOString().split('T')[0]

      // Check if completion exists for today
      const existing = await db.get<{ id: number }>(
        'SELECT id FROM task_completions WHERE task_id = ? AND completed_date = ?',
        [taskId, today]
      )

      if (existing) {
        await db.run(
          'DELETE FROM task_completions WHERE task_id = ? AND completed_date = ?',
          [taskId, today]
        )
        removeCompletedTask(taskId)
      } else {
        await db.run(
          'INSERT INTO task_completions (task_id, completed_date) VALUES (?, ?)',
          [taskId, today]
        )
        addCompletedTask(taskId)
      }

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to toggle task completion:', error)
    }
  }

  const handleToggleFlag = async (taskId: number) => {
    if (!db) return

    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      await db.run(
        'UPDATE tasks SET flagged_for_today = ? WHERE id = ?',
        [task.flagged_for_today ? 0 : 1, taskId]
      )

      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to toggle flag:', error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!db) return

    try {
      await db.run('DELETE FROM tasks WHERE id = ?', [taskId])
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
      selectTask(null)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleCreateSubtask = () => {
    if (!selectedTaskId) return
    setCreatingSubtask(true)
  }

  // Project management handlers (for future use)
  // @ts-expect-error - Will be used when project management UI is added
  const _handleCreateProject = () => {
    setEditingProject(null)
    setProjectDialogOpen(true)
  }

  // @ts-expect-error - Will be used when project management UI is added
  const _handleEditProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setEditingProject(project)
      setProjectDialogOpen(true)
    }
  }

  const handleSaveProject = async (updates: Partial<Project>) => {
    if (!db) return

    try {
      if (editingProject) {
        // Update existing project
        const updateFields = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .map(([key]) => `${key} = ?`)
          .join(', ')

        const values = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .map(([_, value]) => value)

        if (updateFields) {
          await db.run(
            `UPDATE projects SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [...values, editingProject.id]
          )
        }
      } else {
        // Create new project
        await db.run(
          `INSERT INTO projects (name, description, quadrant, maslow_category)
           VALUES (?, ?, ?, ?)`,
          [
            updates.name,
            updates.description || null,
            updates.quadrant || null,
            updates.maslow_category || null,
          ]
        )
      }

      // Refresh projects
      const updatedProjects = await db.all<Project>(
        'SELECT * FROM projects WHERE archived = 0 ORDER BY name'
      )
      setProjects(updatedProjects)
      setProjectDialogOpen(false)
      setEditingProject(null)
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  const handleDeleteProject = async () => {
    if (!db || !editingProject) return

    try {
      // Delete project (tasks will be unassigned due to ON DELETE SET NULL)
      await db.run('DELETE FROM projects WHERE id = ?', [editingProject.id])

      // Refresh projects and tasks
      const [updatedProjects, updatedTasks] = await Promise.all([
        db.all<Project>('SELECT * FROM projects WHERE archived = 0 ORDER BY name'),
        db.all<Task>('SELECT * FROM tasks ORDER BY sort_order'),
      ])

      setProjects(updatedProjects)
      setTasks(updatedTasks)
      setProjectDialogOpen(false)
      setEditingProject(null)
      selectProject(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleMakeSubtask = async (taskId: number, parentTaskId: number) => {
    if (!db) return

    // Prevent circular relationships
    // Check if the proposed parent is a descendant of the task being moved
    const isDescendant = (potentialDescendantId: number, ancestorId: number): boolean => {
      if (potentialDescendantId === ancestorId) return true;

      const potentialDescendant = tasks.find(t => t.id === potentialDescendantId);
      if (!potentialDescendant || !potentialDescendant.parent_task_id) return false;

      return isDescendant(potentialDescendant.parent_task_id, ancestorId);
    };

    if (isDescendant(parentTaskId, taskId)) {
      console.warn('Cannot create circular parent-child relationship');
      return;
    }

    try {
      await db.run(
        'UPDATE tasks SET parent_task_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [parentTaskId, taskId]
      )

      // Auto-adjust parent duration if needed
      await triggerDurationAdjustment(db, taskId)

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to make subtask:', error)
    }
  }

  const handleReorderTask = async (taskId: number, targetTaskId: number, position: 'before' | 'after') => {
    if (!db) return

    try {
      // Get the dragged task and target task
      const draggedTask = tasks.find(t => t.id === taskId)
      const targetTask = tasks.find(t => t.id === targetTaskId)

      if (!draggedTask || !targetTask) return

      // Get all sibling tasks (same parent)
      const siblings = tasks
        .filter(t => t.parent_task_id === draggedTask.parent_task_id && t.id !== taskId)
        .sort((a, b) => a.sort_order - b.sort_order)

      // Find the target task's index among siblings
      const targetIndex = siblings.findIndex(t => t.id === targetTaskId)

      // Insert the dragged task at the appropriate position
      if (position === 'before') {
        siblings.splice(targetIndex, 0, draggedTask)
      } else {
        siblings.splice(targetIndex + 1, 0, draggedTask)
      }

      // Update sort_order for all affected tasks
      for (let i = 0; i < siblings.length; i++) {
        await db.run(
          'UPDATE tasks SET sort_order = ? WHERE id = ?',
          [i, siblings[i].id]
        )
      }

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to reorder task:', error)
    }
  }

  const handleMoveTaskToProject = async (taskId: number, projectId: number) => {
    if (!db) return

    try {
      // Get all descendant tasks recursively
      const getDescendants = (parentId: number): number[] => {
        const children = tasks.filter(t => t.parent_task_id === parentId);
        const descendants = [...children.map(c => c.id)];

        children.forEach(child => {
          descendants.push(...getDescendants(child.id));
        });

        return descendants;
      };

      const taskIdsToMove = [taskId, ...getDescendants(taskId)];

      // Update all tasks (parent and all descendants) to new project
      await Promise.all(
        taskIdsToMove.map(id =>
          db.run(
            'UPDATE tasks SET project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [projectId, id]
          )
        )
      );

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order')
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to move task to project:', error)
    }
  }

  if (loading || !dbInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Filter tasks for different views
  const warmupList = lists.find(l => l.type === 'warmup')
  const cooldownList = lists.find(l => l.type === 'cooldown')
  const inboxList = lists.find(l => l.type === 'inbox')

  const morningTasks = tasks.filter(task => task.list_id === warmupList?.id)
  const cooldownTasks = tasks.filter(task => task.list_id === cooldownList?.id)
  const todayTasks = tasks.filter(task => task.flagged_for_today)

  // Find the "fun" tag
  const funTag = tags.find(tag => tag.name.toLowerCase() === 'fun')
  const funTasks = tasks.filter(task => {
    if (!task.flagged_for_today || !funTag) return false
    const taskTagIds = taskTags.get(task.id) || []
    return taskTagIds.includes(funTag.id)
  })

  const inboxTasks = tasks.filter(task => task.list_id === inboxList?.id)

  // Calculate morning/cooldown completion status
  const morningTasksComplete = morningTasks.length > 0 && morningTasks.every(t => completedToday.has(t.id))
  const cooldownTasksComplete = cooldownTasks.length > 0 && cooldownTasks.every(t => completedToday.has(t.id))

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : undefined
  // @ts-expect-error - For future use in project detail view
  const _selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : undefined
  // @ts-expect-error - For future use in project detail view
  const _projectTasks = selectedProjectId ? tasks.filter(t => t.project_id === selectedProjectId) : []

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
      <AppShell
        onAddTask={() => {
          // QuickAddButton will handle this
        }}
        onMoveTaskToProject={handleMoveTaskToProject}
        lists={lists}
        projects={projects}
        tags={tags}
      >
        {currentView === 'today' && (
          <TodayView
            settings={{
              wake_up_time: settings?.wake_up_time,
              cooldown_time: settings?.cooldown_time,
              sleep_time: settings?.sleep_time,
            }}
            morningTasks={morningTasks}
            todayTasks={todayTasks}
            cooldownTasks={cooldownTasks}
            funTasks={funTasks}
            morningTasksComplete={morningTasksComplete}
            cooldownTasksComplete={cooldownTasksComplete}
            totalTaskDurationMinutes={todayTasks.reduce(
              (sum, t) => sum + (t.duration_minutes || 0),
              0
            )}
            incompleteTasks={todayTasks.length}
            onTaskSelect={selectTask}
            onToggleComplete={handleToggleComplete}
            onToggleFlag={handleToggleFlag}
            selectedTaskId={selectedTaskId}
            completedToday={completedToday}
          />
        )}

        {currentView === 'inbox' && (
          <Box sx={{ p: 3 }}>
            <TaskList
              tasks={inboxTasks}
              onTaskSelect={selectTask}
              onToggleComplete={handleToggleComplete}
              onToggleFlag={handleToggleFlag}
              onMakeSubtask={handleMakeSubtask}
              onReorderTask={handleReorderTask}
              selectedTaskId={selectedTaskId}
              completedToday={completedToday}
              emptyMessage="Your inbox is empty"
            />
          </Box>
        )}

        {currentView === 'settings' && (
          <SettingsView />
        )}

        {currentView === 'tags' && (
          <Box sx={{ height: '100%' }}>
            <TagsView
              tags={tags}
              tasks={tasks}
              taskTags={taskTags}
              selectedTagId={selectedTagId}
              onTagSelect={selectTag}
            />
          </Box>
        )}

        {currentView === 'projects' && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <ProjectsView />
          </Box>
        )}
      </AppShell>

      {/* Project Detail Dialog */}
      <ProjectDetail
        project={editingProject}
        open={projectDialogOpen}
        onClose={() => {
          setProjectDialogOpen(false)
          setEditingProject(null)
        }}
        onSave={handleSaveProject}
        onDelete={editingProject ? handleDeleteProject : undefined}
      />

      {/* Task Detail Drawer */}
      <Drawer
        anchor="right"
        open={!!(selectedTask || creatingSubtask)}
        onClose={() => {
          selectTask(null);
          setCreatingSubtask(false);
        }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400, md: 500 },
            maxWidth: '100vw',
          },
        }}
      >
        <TaskDetail
          task={creatingSubtask ? undefined : selectedTask}
          lists={lists}
          projects={projects}
          tasks={tasks}
          tags={tags}
          taskTags={taskTags}
          onClose={() => {
            selectTask(null)
            setCreatingSubtask(false)
          }}
          onSave={async (updates: Partial<Task>, tagIds?: number[], newTagNames?: string[]) => {
            if (!db) return

            try {
              let taskId: number;

              if (creatingSubtask && selectedTaskId) {
                // Creating a subtask
                const result = await db.run(
                  `INSERT INTO tasks (title, description, context, duration_minutes, parent_task_id, project_id, list_id, flagged_for_today, is_repeating, quadrant, maslow_category, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    updates.title,
                    updates.description || null,
                    updates.context || null,
                    updates.duration_minutes || 0,
                    selectedTaskId, // parent_task_id
                    updates.project_id || null,
                    updates.list_id || null,
                    updates.flagged_for_today ? 1 : 0,
                    updates.is_repeating ? 1 : 0,
                    updates.quadrant || null,
                    updates.maslow_category || null,
                    tasks.length,
                  ]
                )
                taskId = result.lastID;
                setCreatingSubtask(false)
              } else if (selectedTask) {
                // Updating existing task
                taskId = selectedTask.id;
                const updateFields = Object.entries(updates)
                  .filter(([_, value]) => value !== undefined)
                  .map(([key]) => `${key} = ?`)
                  .join(', ')

                const values = Object.entries(updates)
                  .filter(([_, value]) => value !== undefined)
                  .map(([_, value]) => value)

                if (updateFields) {
                  await db.run(
                    `UPDATE tasks SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [...values, selectedTask.id]
                  )
                }
              } else {
                return;
              }

              // Create new tags and get their IDs
              const allTagIds = [...(tagIds || [])];

              if (newTagNames && newTagNames.length > 0) {
                for (const tagName of newTagNames) {
                  // Check if tag already exists
                  const existing = await db.get<import('./db/types').Tag>(
                    'SELECT * FROM tags WHERE name = ?',
                    [tagName]
                  );

                  if (existing) {
                    allTagIds.push(existing.id);
                  } else {
                    // Create new tag
                    const result = await db.run(
                      'INSERT INTO tags (name) VALUES (?)',
                      [tagName]
                    );
                    allTagIds.push(result.lastID);
                  }
                }
              }

              // Update task tags
              if (taskId) {
                // Delete existing tags for this task
                await db.run('DELETE FROM task_tags WHERE task_id = ?', [taskId]);

                // Insert new tags
                for (const tagId of allTagIds) {
                  await db.run(
                    'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)',
                    [taskId, tagId]
                  );
                }
              }

              // Auto-adjust parent duration if duration or parent changed
              if (taskId && (updates.duration_minutes !== undefined || updates.parent_task_id !== undefined)) {
                await triggerDurationAdjustment(db, taskId);
              }

              // Refresh data
              const [updatedTasks, updatedTags, taskTagsData] = await Promise.all([
                db.all<Task>('SELECT * FROM tasks ORDER BY sort_order'),
                db.all<import('./db/types').Tag>('SELECT * FROM tags ORDER BY name'),
                db.all<import('./db/types').TaskTag>('SELECT task_id, tag_id FROM task_tags'),
              ]);

              const taskTagsMap = new Map<number, number[]>();
              taskTagsData.forEach((tt) => {
                if (!taskTagsMap.has(tt.task_id)) {
                  taskTagsMap.set(tt.task_id, []);
                }
                taskTagsMap.get(tt.task_id)!.push(tt.tag_id);
              });

              setTasks(updatedTasks);
              setTags(updatedTags);
              setTaskTags(taskTagsMap);
            } catch (error) {
              console.error('Failed to save task:', error)
            }
          }}
          onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
          onCreateSubtask={selectedTask && !creatingSubtask ? handleCreateSubtask : undefined}
        />
      </Drawer>

      {/* Quick Add Button */}
      <QuickAddButton onAdd={handleAddTask} />
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AppContentInner />
    </ThemeProvider>
  )
}

export default App
