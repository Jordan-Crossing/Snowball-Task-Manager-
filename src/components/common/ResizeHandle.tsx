/**
 * ResizeHandle - Draggable column divider for resizing miller columns
 */

import React, { useState, useCallback, useRef } from 'react';
import { Box } from '@mui/material';

interface ResizeHandleProps {
  /** Called when resize starts */
  onResizeStart?: () => void;
  /** Called during resize with delta X in pixels */
  onResize: (deltaX: number) => void;
  /** Called when resize ends */
  onResizeEnd?: () => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResizeStart,
  onResize,
  onResizeEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      onResizeStart?.();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;
        onResize(deltaX);
        startXRef.current = moveEvent.clientX;
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        onResizeEnd?.();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onResize, onResizeStart, onResizeEnd]
  );

  return (
    <Box
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      sx={{
        width: '8px',
        minWidth: '8px',
        cursor: 'col-resize',
        position: 'relative',
        userSelect: 'none',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDragging || isHovering ? 'primary.main' : 'transparent',
        transition: isDragging ? 'none' : 'background-color 0.2s',
        '&:hover': {
          backgroundColor: 'primary.main',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1px',
          backgroundColor: 'divider',
        },
      }}
    />
  );
};
