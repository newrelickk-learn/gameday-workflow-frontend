'use client';

import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface ReceiptCarouselProps {
  images: string[];
}

export default function ReceiptCarousel({ images }: ReceiptCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [loadedSrcs, setLoadedSrcs] = useState<Record<string, string>>({});
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    objectUrlsRef.current = [];

    const lazyLoadImages = async () => {
      const remaining = [...images].reverse();
      for (const url of remaining) {
        if (cancelled) return;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrlsRef.current.push(objectUrl);
          setLoadedSrcs((prev) => ({ ...prev, [url]: objectUrl }));
        } catch {
        }
      }
    };

    lazyLoadImages();

    return () => {
      cancelled = true;
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  if (images.length === 0) {
    return null;
  }

  const goPrev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const goNext = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 420,
          overflow: 'hidden',
          borderRadius: 1,
          bgcolor: 'grey.100',
        }}
      >
        {!loadedSrcs[images[current]] && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}
        {images.map((url, index) => {
          const src = loadedSrcs[url];
          if (!src) {
            return null;
          }
          return (
            <img
              key={url}
              src={src}
              alt={`レシート${index + 1}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: index === current ? 1 : 0,
                zIndex: index === current ? 1 : 0,
              }}
            />
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <IconButton onClick={goPrev} size="small" aria-label="前の画像">
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {current + 1} / {images.length}
        </Typography>
        <IconButton onClick={goNext} size="small" aria-label="次の画像">
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
