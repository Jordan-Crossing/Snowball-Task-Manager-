import React from 'react';
import { Box, Typography } from '@mui/material';
import { TaskList } from '../Tasks/TaskList';
import { AddTaskInput } from '../common';
import type { Task, List, Tag } from '../../db/types';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InboxIcon from '@mui/icons-material/Inbox';

interface ListViewProps {
  list?: List;
  tasks: Task[];
  tags?: Tag[];
  taskTags?: Map<number, number[]>;
  onAddTask?: (title: string) => void;
  selectedTaskId?: number | null;
  completedToday: Set<number>;
}

export const ListView: React.FC<ListViewProps> = ({
  list,
  tasks,
  tags,
  taskTags,
  onAddTask,
  selectedTaskId,
  completedToday,
}) => {
  if (!list) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          Select a list to view tasks
        </Typography>
      </Box>
    );
  }

  const getListIcon = () => {
    switch (list.type) {
      case 'warmup': return <WbSunnyIcon />;
      case 'cooldown': return <NightsStayIcon />;
      case 'inbox': return <InboxIcon />;
      default: return <AssignmentIcon />;
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          {list.name}
        </Typography>
      </Box>

      {onAddTask && (
        <AddTaskInput 
          onAdd={onAddTask} 
          placeholder={`Add task to ${list.name}...`}
          icon={getListIcon()}
        />
      )}

      <TaskList
        tasks={tasks}
        tags={tags}
        taskTags={taskTags}
        selectedTaskId={selectedTaskId}
        completedToday={completedToday}
        emptyMessage={`No tasks in ${list.name}`}
      />
    </Box>
  );
};
