import { ref, onBeforeUnmount } from 'vue'

/**
 * Composable that provides drag-to-move functionality for a floating panel.
 *
 * @param initialX - Initial X position in pixels (default: centered on viewport at 80vw width)
 * @param initialY - Initial Y position in pixels (default: centered on viewport at 80vh height)
 */
export function useDraggable(initialX?: number, initialY?: number) {
  const x = ref(initialX ?? Math.max(0, (window.innerWidth - window.innerWidth * 0.8) / 2))
  const y = ref(initialY ?? Math.max(0, (window.innerHeight - window.innerHeight * 0.8) / 2))
  const isDragging = ref(false)

  let startX = 0
  let startY = 0

  function onDragStart(e: MouseEvent) {
    // Only respond to primary button (left click)
    if (e.button !== 0) return
    isDragging.value = true
    startX = e.clientX - x.value
    startY = e.clientY - y.value
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  function onDragMove(e: MouseEvent) {
    if (!isDragging.value) return
    x.value = e.clientX - startX
    y.value = e.clientY - startY
  }

  function onDragEnd() {
    isDragging.value = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  })

  return { x, y, isDragging, onDragStart }
}
