import { useEffect, useState, useCallback } from 'react'
import { Box, CircularProgress, CssBaseline, Drawer, Typography } from '@mui/material'
import { getDatabase } from './db'
import { AppShell, TodayView, TaskList, TaskDetail, QuickAddButton, SettingsView, ProjectDetail, TagsView, ProjectsView, ListView, TrashView } from './components'
import { AddTaskInput } from './components/common/AddTaskInput'
import InboxIcon from '@mui/icons-material/Inbox'
import { useResponsive } from './hooks'
import { ThemeProvider } from './theme'
import { useStore } from './store/useStore'
import { triggerDurationAdjustment } from './utils/taskDuration'
import type { Project, Task, Settings, List } from './db/types'
import './App.css'

function AppContentInner() {
  const { isMobile } = useResponsive()
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [creatingSubtask, setCreatingSubtask] = useState(false)

  const {
    db,
    setDb,
    loading,
    setLoading,
    dbInitialized,
    setDbInitialized,
    tasks,
    setTasks,
    settings,
    setSettings,
    lists,
    setLists,
    projects,
    setProjects,
    tags,
    setTags,
    taskTags,
    setTaskTags,
    completedToday,
    setCompletedToday,
    selectTask,
    selectProject,
    currentView,
    selectedTaskId,
    selectedProjectId,
    selectedListId,
    // Mutations
    addTask,
    updateTask,
    deleteTask,
    addProject,
    updateProject,
    deleteProject,
    addTag,
    updateTaskTags,
    moveTask,
  } = useStore()

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      try {
        const database = await getDatabase()
        setDb(database)
        setDbInitialized(true)

        // Migration: Add deleted_at column if missing
        try {
          await database.exec('ALTER TABLE tasks ADD COLUMN deleted_at TEXT');
        } catch (e) {
          // Column likely exists, ignore
        }

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
        
        const completedIds = new Set(completionsData.map((c: { task_id: number }) => c.task_id));
        tasksData.forEach(t => {
          if (t.completed) completedIds.add(t.id);
        });
        setCompletedToday(completedIds)
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
    let listId = lists.find(l => l.type === 'inbox')?.id || 1;
    let projectId: number | undefined;
    let isRepeating = false;

    if (currentView === 'lists' && selectedListId) {
      listId = selectedListId;
      const list = lists.find(l => l.id === listId);
      // Default to repeating for Warmup/Cooldown lists
      if (list && (list.type === 'warmup' || list.type === 'cooldown')) {
         isRepeating = true;
      }
    } else if (currentView === 'projects' && selectedProjectId) {
      projectId = selectedProjectId;
    }

    await addTask({
      title,
      list_id: listId,
      project_id: projectId,
      is_repeating: isRepeating,
      sort_order: tasks.length
    });
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
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
    try {
      if (editingProject) {
        await updateProject(editingProject.id, updates);
      } else {
        await addProject(updates);
      }
      setProjectDialogOpen(false)
      setEditingProject(null)
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  const handleDeleteProject = async () => {
    if (!editingProject) return

    try {
      await deleteProject(editingProject.id);
      setProjectDialogOpen(false)
      setEditingProject(null)
      selectProject(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }


    const handleMoveTaskToProject = async (taskId: number, projectId: number) => {
    await moveTask(taskId, projectId);
  }

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : undefined

  const handleSaveTask = useCallback(async (updates: Partial<Task>, tagIds?: number[], newTagNames?: string[]) => {
    try {
      let taskId: number | undefined;

      if (creatingSubtask && selectedTaskId) {
        // Creating a subtask
        const newTask = await addTask({
          ...updates,
          parent_task_id: selectedTaskId,
          sort_order: tasks.length,
        });
        taskId = newTask?.id;
        setCreatingSubtask(false);
      } else if (selectedTask) {
        // Updating existing task
        taskId = selectedTask.id;
        await updateTask(taskId, updates);
      } else {
        return;
      }

      if (!taskId) return;

      // Create new tags and get their IDs
      const allTagIds = [...(tagIds || [])];

      if (newTagNames && newTagNames.length > 0) {
        for (const tagName of newTagNames) {
          // Check if tag already exists
          const existing = tags.find(t => t.name === tagName);

          if (existing) {
            allTagIds.push(existing.id);
          } else {
            // Create new tag
            const newTag = await addTag({ name: tagName });
            if (newTag) {
              allTagIds.push(newTag.id);
            }
          }
        }
      }

      // Update task tags
      await updateTaskTags(taskId, allTagIds);

      // Auto-adjust parent duration if duration or parent changed
      if (updates.duration_minutes !== undefined || updates.parent_task_id !== undefined) {
        if (db) {
           await triggerDurationAdjustment(db, taskId);
           // Refresh tasks to reflect duration changes
           const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order');
           setTasks(updatedTasks);
        }
      }

    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }, [creatingSubtask, selectedTaskId, selectedTask, tasks.length, tags, db, addTask, updateTask, addTag, updateTaskTags, setTasks]);


  if (loading || !dbInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Filter tasks for different views
  const activeTasks = tasks.filter(t => !t.deleted_at);
  
  const warmupList = lists.find(l => l.type === 'warmup')
  const cooldownList = lists.find(l => l.type === 'cooldown')
  const inboxList = lists.find(l => l.type === 'inbox')

  const morningTasks = activeTasks.filter(task => task.list_id === warmupList?.id)
  const cooldownTasks = activeTasks.filter(task => task.list_id === cooldownList?.id)
  const todayTasks = activeTasks.filter(task => task.flagged_for_today)

  // Inbox should not show flagged tasks (they move to Today)
  const inboxTasks = activeTasks.filter(task => task.list_id === inboxList?.id && !task.flagged_for_today)

  // Calculate morning/cooldown completion status
  const morningTasksComplete = morningTasks.length > 0 && morningTasks.every(t => completedToday.has(t.id))
  const cooldownTasksComplete = cooldownTasks.length > 0 && cooldownTasks.every(t => completedToday.has(t.id))

  // @ts-expect-error - For future use in project detail view
  const _selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : undefined
  // @ts-expect-error - For future use in project detail view
  const _projectTasks = selectedProjectId ? activeTasks.filter(t => t.project_id === selectedProjectId) : []

  const taskDetailPanel = (selectedTask || creatingSubtask) ? (
    <TaskDetail
      task={creatingSubtask ? undefined : selectedTask}
      lists={lists}
      projects={projects}
      tasks={activeTasks}
      tags={tags}
      taskTags={taskTags}
      onClose={() => {
        selectTask(null)
        setCreatingSubtask(false)
      }}
      onSave={handleSaveTask}
      onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
      onCreateSubtask={selectedTask && !creatingSubtask ? handleCreateSubtask : undefined}
    />
  ) : undefined;

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
      <AppShell
        onAddTask={() => {
          // QuickAddButton will handle this
        }}
        onMoveTaskToProject={handleMoveTaskToProject}
        onDeleteTask={handleDeleteTask}
        lists={lists}
        projects={projects}
        tags={tags}
        inboxCount={inboxTasks.length}
        detailPanel={taskDetailPanel}
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
            tags={tags}
            taskTags={taskTags}
            morningTasksComplete={morningTasksComplete}
            cooldownTasksComplete={cooldownTasksComplete}
            totalTaskDurationMinutes={todayTasks
              .filter(t => !completedToday.has(t.id))
              .reduce((sum, t) => sum + (t.duration_minutes || 0), 0)
            }
            incompleteTasks={todayTasks.filter(t => !completedToday.has(t.id)).length}
            selectedTaskId={selectedTaskId}
            completedToday={completedToday}
          />
        )}

        {currentView === 'inbox' && (
          <Box sx={{ p: 3 }}>
            <AddTaskInput 
              onAdd={handleAddTask} 
              placeholder="Add task to Inbox..."
              icon={<InboxIcon />}
            />
            <TaskList
              tasks={inboxTasks}
              tags={tags}
              taskTags={taskTags}
              selectedTaskId={selectedTaskId}
              completedToday={completedToday}
              emptyMessage="Your inbox is empty"
            />
          </Box>
        )}

        {currentView === 'flagged' && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">Flagged Tasks</Typography>
            </Box>
            <TaskList
              tasks={todayTasks}
              tags={tags}
              taskTags={taskTags}
              selectedTaskId={selectedTaskId}
              completedToday={completedToday}
              emptyMessage="No flagged tasks"
            />
          </Box>
        )}

        {currentView === 'lists' && (
          <ListView
            list={lists.find(l => l.id === selectedListId)}
            tasks={tasks.filter(t => t.list_id === selectedListId)}
            tags={tags}
            taskTags={taskTags}
            onAddTask={handleAddTask}
            selectedTaskId={selectedTaskId}
            completedToday={completedToday}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView />
        )}

        {currentView === 'trash' && (
          <TrashView />
        )}

        {currentView === 'tags' && (
          <Box sx={{ height: '100%' }}>
            <TagsView />
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

      {/* Task Detail Drawer - Mobile Only */}
      {isMobile && (
        <Drawer
          anchor="right"
          open={!!(selectedTask || creatingSubtask)}
          onClose={() => {
            selectTask(null);
            setCreatingSubtask(false);
          }}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '100vw',
            },
          }}
        >
          {taskDetailPanel}
        </Drawer>
      )}

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
