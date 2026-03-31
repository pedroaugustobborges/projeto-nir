import { useEffect, useCallback, useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  alt?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  alt = 'Visualização da imagem',
}: ImagePreviewModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and position when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setZoom(prevZoom => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta));

      // Reset position when zooming back to 1
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }

      return newZoom;
    });
  }, []);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  // Handle drag move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Limit panning based on zoom level
      const maxPan = (zoom - 1) * 200;
      setPosition({
        x: Math.min(maxPan, Math.max(-maxPan, newX)),
        y: Math.min(maxPan, Math.max(-maxPan, newY)),
      });
    }
  }, [isDragging, zoom, dragStart]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(MIN_ZOOM, prev - ZOOM_STEP);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  if (!isVisible) return null;

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-sm"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Title */}
      {title && (
        <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-lg">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-full">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          disabled={zoom <= MIN_ZOOM}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <span className="text-white/90 text-sm font-medium min-w-[4rem] text-center">
          {zoomPercentage}%
        </span>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          disabled={zoom >= MAX_ZOOM}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {zoom > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 ml-1 border-l border-white/20 pl-3"
            aria-label="Resetar zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* Helper text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
        <p className="text-white/70 text-sm">
          Use o <span className="text-white/90 font-medium">scroll do mouse</span> para zoom
          {zoom > 1 && <> • <span className="text-white/90 font-medium">Arraste</span> para mover</>}
          {' '} • <kbd className="px-2 py-0.5 bg-white/20 rounded text-white/90">ESC</kbd> para fechar
        </p>
      </div>
    </div>
  );
}

// Reusable thumbnail component that opens the preview
interface ImageThumbnailProps {
  imageUrl: string;
  alt?: string;
  title?: string;
  className?: string;
}

export function ImageThumbnail({
  imageUrl,
  alt = 'Imagem',
  title,
  className = '',
}: ImageThumbnailProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg ${className}`}
        aria-label="Clique para ampliar a imagem"
      >
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-48 object-contain transition-transform duration-200 group-hover:scale-105"
        />
        {/* Overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg">
            <ZoomIn className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </div>
        </div>
        {/* Hint text */}
        <div className="absolute bottom-0 left-0 right-0 py-2 px-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-white text-xs text-center font-medium">
            Clique para ampliar
          </p>
        </div>
      </button>

      <ImagePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageUrl}
        title={title}
        alt={alt}
      />
    </>
  );
}
