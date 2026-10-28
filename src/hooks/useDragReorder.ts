import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

/**
 * Pointer-based drag & drop reordering (touch + mouse) without external dependencies.
 *
 * - The drag starts only from the "handle" element (so inputs inside the card keep working).
 * - The list is reordered live while the pointer moves over the other cards' midpoints.
 * - Auto-scrolls the scroll container when the pointer gets close to its top/bottom edge.
 */
export function useDragReorder(
  ids: string[],
  onMove: (fromIndex: number, toIndex: number) => void,
  scrollContainerRef: React.RefObject<HTMLElement | null>
) {
  const itemEls = useRef(new Map<string, HTMLElement>());
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const lastPointerY = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const registerItem = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) itemEls.current.set(id, el);
      else itemEls.current.delete(id);
    },
    []
  );

  const recompute = useCallback((clientY: number) => {
    const dragId = draggingIdRef.current;
    if (!dragId) return;
    const list = idsRef.current;
    const fromIndex = list.indexOf(dragId);
    if (fromIndex < 0) return;

    // Target index = number of OTHER cards whose vertical midpoint is above the pointer
    let targetIndex = 0;
    for (const id of list) {
      if (id === dragId) continue;
      const el = itemEls.current.get(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top + rect.height / 2 < clientY) targetIndex += 1;
    }

    if (targetIndex !== fromIndex) {
      onMoveRef.current(fromIndex, targetIndex);
      try {
        navigator.vibrate?.(8);
      } catch {
        // vibration not supported
      }
    }
  }, []);

  const stopAutoScroll = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const autoScrollLoop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && draggingIdRef.current) {
      const rect = container.getBoundingClientRect();
      const edge = 70;
      const y = lastPointerY.current;
      let delta = 0;
      if (y < rect.top + edge) delta = -Math.ceil((rect.top + edge - y) / 6);
      else if (y > rect.bottom - edge) delta = Math.ceil((y - (rect.bottom - edge)) / 6);
      if (delta !== 0) {
        container.scrollTop += delta;
        recompute(y);
      }
    }
    if (draggingIdRef.current) {
      rafRef.current = requestAnimationFrame(autoScrollLoop);
    }
  }, [recompute, scrollContainerRef]);

  const endDrag = useCallback(() => {
    draggingIdRef.current = null;
    setDraggingId(null);
    stopAutoScroll();
  }, []);

  useEffect(() => () => stopAutoScroll(), []);

  const getHandleProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      draggingIdRef.current = id;
      lastPointerY.current = e.clientY;
      setDraggingId(id);
      stopAutoScroll();
      rafRef.current = requestAnimationFrame(autoScrollLoop);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingIdRef.current !== id) return;
      e.preventDefault();
      lastPointerY.current = e.clientY;
      recompute(e.clientY);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    style: {
      touchAction: 'none' as const,
      cursor: draggingId === id ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
    },
  });

  return { draggingId, registerItem, getHandleProps };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
