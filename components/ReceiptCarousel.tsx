'use client';

import { Box, IconButton, Typography } from '@mui/material';
import { useState } from 'react';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface ReceiptCarouselProps {
  images: string[];
}

export default function ReceiptCarousel({ images }: ReceiptCarouselProps) {
  const [current, setCurrent] = useState(0);

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
        {images.map((url, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={`レシート${index + 1}`}
            loading="eager"
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
        ))}
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
