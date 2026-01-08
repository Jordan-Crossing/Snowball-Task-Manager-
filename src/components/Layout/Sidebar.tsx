/**
 * Desktop sidebar navigation component
 * Persistent navigation with collapsible sections
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import InboxIcon from '@mui/icons-material/Inbox';
import FlagIcon from '@mui/icons-material/Flag';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SettingsIcon from '@mui/icons-material/Settings';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import ListIcon from '@mui/icons-material/List';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import type { AppState } from './useAppState';
import type { Project, List as ListType } from '../../db/types';

interface SidebarProps {
  state: AppState;
  onNavigate: (view: AppState['currentView'], id?: number) => void;
  projects?: Project[];
  lists?: Array<{ id: number; name: string; type: string }>;
  tags?: Array<{ id: number; name: string }>;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
  onDeleteTask?: (taskId: number) => void;
  inboxCount?: number;
  morningList?: ListType;
  cooldownList?: ListType;
}

interface ProjectItemProps {
  project: Project;
  selected: boolean;
  onClick: () => void;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
}

const RubbishItem: React.FC<{
  selected: boolean;
  onClick: () => void;
  onDeleteTask?: (taskId: number) => void;
}> = ({ selected, onClick, onDeleteTask }) => {
  const ref = useRef<HTMLLIElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onDeleteTask) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'trash' }),
      canDrop: ({ source }) => source.data.type === 'task',
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: ({ source }) => {
        setIsOver(false);
        const taskId = source.data.taskId as number;
        if (taskId) {
          onDeleteTask(taskId);
        }
      },
    });
  }, [onDeleteTask]);

  return (
    <ListItem
      ref={ref}
      disablePadding
      sx={{
        backgroundColor: isOver ? 'rgba(211, 47, 47, 0.08)' : 'transparent',
        transition: 'background-color 0.2s ease',
      }}
    >
      <ListItemButton
        selected={selected}
        onClick={onClick}
      >
        <ListItemIcon>
          <DeleteOutlineIcon color={isOver ? 'error' : 'inherit'} />
        </ListItemIcon>
        <ListItemText 
          primary="Rubbish" 
          primaryTypographyProps={{
            color: isOver ? 'error' : 'inherit',
            fontWeight: isOver ? 'bold' : 'inherit'
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

const ProjectItem: React.FC<ProjectItemProps> = ({ project, selected, onClick, onMoveTaskToProject }) => {
  const ref = useRef<HTMLLIElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onMoveTaskToProject) return;

    return combine(
      dropTargetForElements({
        element: el,
        getData: () => ({ projectId: project.id, type: 'project' }),
        canDrop: ({ source }) => {
          return source.data.type === 'task';
        },
        onDragEnter: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: ({ source }) => {
          setIsOver(false);
          const taskId = source.data.taskId as number;
          if (taskId && onMoveTaskToProject) {
            onMoveTaskToProject(taskId, project.id);
          }
        },
      })
    );
  }, [project.id, onMoveTaskToProject]);

  return (
    <ListItem
      ref={ref}
      disablePadding
      sx={{
        pl: 4,
        backgroundColor: isOver ? 'primary.light' : 'transparent',
        transition: 'background-color 0.2s ease',
        borderLeft: isOver ? '3px solid' : 'none',
        borderColor: isOver ? 'primary.main' : 'transparent',
      }}
    >
      <ListItemButton
        selected={selected}
        onClick={onClick}
        dense
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <AccountTreeIcon fontSize="small" color="secondary" />
        </ListItemIcon>
        <ListItemText
          primary={project.name}
          primaryTypographyProps={{ fontSize: '0.875rem' }}
        />
      </ListItemButton>
    </ListItem>
  );
};

// Sort projects alphabetically
function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}

export const Sidebar: React.FC<SidebarProps> = ({
  state,
  onNavigate,
  projects = [],
  lists = [],
  tags = [],
  onMoveTaskToProject,
  onDeleteTask,
  inboxCount = 0,
  morningList,
  cooldownList,
}) => {
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const sortedProjects = sortProjects(projects);

  return (
    <Box
      sx={{
        width: 280,
        height: '100vh',
        overflow: 'auto',
        backgroundColor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2.5, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        paddingTop: 'calc(env(safe-area-inset-top) + 20px)',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          ❄️ Snowball
        </Typography>
      </Box>

      {/* Primary Navigation */}
      <List sx={{ flex: 0, pb: 1 }}>
        {/* Today */}
        <ListItem disablePadding>
          <ListItemButton
            selected={state.currentView === 'today'}
            onClick={() => onNavigate('today')}
          >
            <ListItemIcon>
              <TodayIcon />
            </ListItemIcon>
            <ListItemText primary="Today" />
          </ListItemButton>
        </ListItem>

        {/* Inbox */}
        <ListItem disablePadding>
          <ListItemButton
            selected={state.currentView === 'inbox'}
            onClick={() => onNavigate('inbox')}
          >
            <ListItemIcon>
              <InboxIcon />
            </ListItemIcon>
            <ListItemText primary="Inbox" />
            {inboxCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                {inboxCount}
              </Typography>
            )}
          </ListItemButton>
        </ListItem>

        {/* Flagged */}
        <ListItem disablePadding>
          <ListItemButton
            selected={state.currentView === 'flagged'}
            onClick={() => onNavigate('flagged')}
          >
            <ListItemIcon>
              <FlagIcon />
            </ListItemIcon>
            <ListItemText primary="Flagged" />
          </ListItemButton>
        </ListItem>
      </List>

      <Divider />

      {/* Lists Section - Morning/Cooldown are permanent UI elements */}
      <List sx={{ flex: 0 }}>
        {/* Morning - Always shown */}
        <ListItem disablePadding>
          <ListItemButton
            selected={state.currentView === 'lists' && state.selectedListId === morningList?.id}
            onClick={() => morningList && onNavigate('lists', morningList.id)}
            disabled={!morningList}
          >
            <ListItemIcon>
              <WbSunnyIcon />
            </ListItemIcon>
            <ListItemText primary="Morning" />
          </ListItemButton>
        </ListItem>

        {/* Cooldown - Always shown */}
        <ListItem disablePadding>
          <ListItemButton
            selected={state.currentView === 'lists' && state.selectedListId === cooldownList?.id}
            onClick={() => cooldownList && onNavigate('lists', cooldownList.id)}
            disabled={!cooldownList}
          >
            <ListItemIcon>
              <BedtimeIcon />
            </ListItemIcon>
            <ListItemText primary="Cooldown" />
          </ListItemButton>
        </ListItem>

        {/* Custom lists only - dynamically rendered */}
        {lists?.filter(l => l.type === 'custom').map((list) => (
          <ListItem key={list.id} disablePadding>
            <ListItemButton
              selected={state.currentView === 'lists' && state.selectedListId === list.id}
              onClick={() => onNavigate('lists', list.id)}
            >
              <ListItemIcon>
                <ListIcon />
              </ListItemIcon>
              <ListItemText primary={list.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Projects Section */}
      <List sx={{ flex: 0 }}>
        <ListItemButton
          selected={state.currentView === 'projects' && !state.selectedProjectId}
          onClick={() => {
            onNavigate('projects', undefined);
            setProjectsExpanded(!projectsExpanded);
          }}
        >
          <ListItemIcon>
            <AccountTreeIcon />
          </ListItemIcon>
          <ListItemText primary="Projects" />
          {projectsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={projectsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {sortedProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                selected={state.currentView === 'projects' && state.selectedProjectId === project.id}
                onClick={() => onNavigate('projects', project.id)}
                onMoveTaskToProject={onMoveTaskToProject}
              />
            ))}
          </List>
        </Collapse>
      </List>

      {/* Tags Section */}
      <List sx={{ flex: 0 }}>
        <ListItemButton
          selected={state.currentView === 'tags' && !state.selectedTagId}
          onClick={() => {
            onNavigate('tags');
            setTagsExpanded(!tagsExpanded);
          }}
        >
          <ListItemIcon>
            <LocalOfferIcon />
          </ListItemIcon>
          <ListItemText primary="Tags" />
          {tagsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={tagsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {tags.map((tag) => (
              <ListItem key={tag.id} disablePadding sx={{ pl: 4 }}>
                <ListItemButton
                  selected={state.currentView === 'tags' && state.selectedTagId === tag.id}
                  onClick={() => onNavigate('tags', tag.id)}
                  dense
                >
                  <ListItemText primary={tag.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </List>

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Settings */}
      <Divider />
      <List sx={{ flex: 0 }}>
        <RubbishItem
          selected={state.currentView === 'trash'}
          onClick={() => onNavigate('trash')}
          onDeleteTask={onDeleteTask}
        />
        <ListItem disablePadding>
          <ListItemButton
            selected={state.currentView === 'settings'}
            onClick={() => onNavigate('settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
};
