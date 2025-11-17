import { useState, useEffect, useRef } from 'react'
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Checkbox,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import './App.css'

interface Task {
  id: string
  text: string
  completed: boolean
}

function TaskItem({ task, onToggle, onDelete, index }: { 
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  index: number
}) {
  const ref = useRef<HTMLLIElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    const el = ref.current
    const dragHandle = dragHandleRef.current
    if (!el || !dragHandle) return

    return combine(
      draggable({
        element: el,
        dragHandle: dragHandle,
        getInitialData: () => ({ taskId: task.id, index }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: () => ({ taskId: task.id, index }),
        onDragEnter: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: () => setIsOver(false),
      })
    )
  }, [task.id, index])

  return (
    <ListItem
      ref={ref}
      sx={{
        bgcolor: isDragging ? 'action.hover' : isOver ? 'action.selected' : 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
      secondaryAction={
        <IconButton edge="end" onClick={() => onDelete(task.id)}>
          <DeleteIcon />
        </IconButton>
      }
    >
      <Box
        ref={dragHandleRef}
        sx={{ 
          cursor: 'grab', 
          display: 'flex', 
          alignItems: 'center',
          mr: 1,
          '&:active': { cursor: 'grabbing' }
        }}
      >
        <DragIndicatorIcon />
      </Box>
      <Checkbox
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        edge="start"
      />
      <ListItemText
        primary={task.text}
        sx={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'text.secondary' : 'text.primary',
        }}
      />
    </ListItem>
  )
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Welcome to Snowball Task Manager!', completed: false },
    { id: '2', text: 'Drag tasks to reorder them', completed: false },
    { id: '3', text: 'Click checkbox to mark as complete', completed: false },
  ])
  const [newTaskText, setNewTaskText] = useState('')

  const addTask = () => {
    if (newTaskText.trim()) {
      setTasks([
        ...tasks,
        {
          id: Date.now().toString(),
          text: newTaskText,
          completed: false,
        },
      ])
      setNewTaskText('')
    }
  }

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  useEffect(() => {
    const handleDrop = (event: any) => {
      const { source, location } = event
      if (!location.current.dropTargets.length) return

      const sourceIndex = source.data.index
      const destinationIndex = location.current.dropTargets[0].data.index

      if (sourceIndex === destinationIndex) return

      setTasks(prevTasks => {
        const newTasks = [...prevTasks]
        const [removed] = newTasks.splice(sourceIndex, 1)
        newTasks.splice(destinationIndex, 0, removed)
        return newTasks
      })
    }

    const unsubscribe = dropTargetForElements({
      element: document.body,
      onDrop: handleDrop,
    })

    return unsubscribe
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ❄️ Snowball Task Manager
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
          />
          <Button variant="contained" onClick={addTask}>
            Add
          </Button>
        </Box>

        <List>
          {tasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              index={index}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          ))}
        </List>

        {tasks.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No tasks yet. Add one above!
          </Typography>
        )}
      </Paper>
    </Container>
  )
}

export default App

