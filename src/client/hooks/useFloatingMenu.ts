import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

type Options = {
  maxHeight: number;
  preferredWidth?: number;
};

export function useFloatingMenu(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  { maxHeight, preferredWidth = 0 }: Options
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const anchor = anchorRef.current;
      if (!anchor) {
        setStyle({ visibility: 'hidden' });
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportGap = 8;
      const menuGap = 5;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(
        Math.max(rect.width, preferredWidth),
        Math.max(120, viewportWidth - viewportGap * 2)
      );
      const left = Math.min(
        Math.max(viewportGap, rect.left),
        Math.max(viewportGap, viewportWidth - width - viewportGap)
      );
      const spaceBelow = viewportHeight - rect.bottom - menuGap - viewportGap;
      const spaceAbove = rect.top - menuGap - viewportGap;
      const opensUp = spaceBelow < Math.min(maxHeight, 140) && spaceAbove > spaceBelow;
      const availableHeight = Math.max(72, opensUp ? spaceAbove : spaceBelow);

      setStyle({
        position: 'fixed',
        visibility: rect.bottom < 0 || rect.top > viewportHeight ? 'hidden' : 'visible',
        left,
        right: 'auto',
        top: opensUp ? 'auto' : rect.bottom + menuGap,
        bottom: opensUp ? viewportHeight - rect.top + menuGap : 'auto',
        width,
        minWidth: width,
        maxHeight: Math.min(maxHeight, availableHeight),
        zIndex: 1000
      });
    }

    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [anchorRef, maxHeight, open, preferredWidth]);

  return style;
}
