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
import FolderIcon from '@mui/icons-material/Folder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ListIcon from '@mui/icons-material/List';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import type { AppState } from './useAppState';
import type { Project } from '../../db/types';

interface SidebarProps {
  state: AppState;
  onNavigate: (view: AppState['currentView'], id?: number) => void;
  projects?: Project[];
  lists?: Array<{ id: number; name: string; type: string }>;
  tags?: Array<{ id: number; name: string }>;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
}

interface ProjectItemProps {
  project: Project;
  selected: boolean;
  onClick: () => void;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
}

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
}) => {
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [listsExpanded, setListsExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const primaryItems = [
    { label: 'Today', view: 'today' as const, icon: TodayIcon },
    { label: 'Inbox', view: 'inbox' as const, icon: InboxIcon },
  ];

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
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          ❄️ Snowball
        </Typography>
      </Box>

      {/* Primary Navigation */}
      <List sx={{ flex: 0, pb: 1 }}>
        {primaryItems.map((item) => (
          <ListItem key={item.view} disablePadding>
            <ListItemButton
              selected={state.currentView === item.view}
              onClick={() => onNavigate(item.view)}
            >
              <ListItemIcon>
                <item.icon />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Lists Section */}
      <List sx={{ flex: 0 }}>
        <ListItemButton
          selected={state.currentView === 'lists' && !state.selectedListId}
          onClick={() => {
            onNavigate('lists');
            setListsExpanded(!listsExpanded);
          }}
        >
          <ListItemIcon>
            <ListIcon />
          </ListItemIcon>
          <ListItemText primary="Lists" />
          {listsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={listsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {lists.map((list) => (
              <ListItem key={list.id} disablePadding sx={{ pl: 4 }}>
                <ListItemButton
                  selected={state.currentView === 'lists' && state.selectedListId === list.id}
                  onClick={() => onNavigate('lists', list.id)}
                  dense
                >
                  <ListItemText primary={list.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </List>

      {/* Projects Section */}
      <List sx={{ flex: 0 }}>
        <ListItemButton
          selected={state.currentView === 'projects' && !state.selectedProjectId}
          onClick={() => {
            onNavigate('projects');
            setProjectsExpanded(!projectsExpanded);
          }}
        >
          <ListItemIcon>
            <FolderIcon />
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
