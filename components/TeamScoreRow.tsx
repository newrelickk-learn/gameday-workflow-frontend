'use client';

import * as React from 'react';
import { useEffect } from 'react';
import Avatar from 'boring-avatars';
import { useSpring, animated, config } from 'react-spring';
import { Box, Typography } from '@mui/material';

interface TeamScoreRowProps {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  rank: number;
  /** 1位を確定演出に切り替えるフラグ。総括の最終ステージまでは立てない */
  isWinnerDetermined?: boolean;
  style?: React.CSSProperties;
}

const ORDINAL_SUFFIX = ['th', 'st', 'nd', 'rd'];

function ordinalSuffix(rank: number): string {
  return ORDINAL_SUFFIX[rank] ?? 'th';
}

export default function TeamScoreRow({
  id,
  name,
  score,
  maxScore,
  rank,
  isWinnerDetermined = false,
  style,
}: TeamScoreRowProps) {
  const isFirst = rank === 1;
  // 確定フラグが来るまでは1位も通常の見た目のままにして、サプライズ感を残す
  const showWinnerStyle = isFirst && isWinnerDetermined;

  const getRankColor = (r: number) => {
    if (!isWinnerDetermined) return '#00FFFF';
    if (r === 1) return '#FFF04D'; // ゴールド
    if (r === 2) return '#E0E0E0'; // シルバー
    if (r === 3) return '#CD7F32'; // ブロンズ
    return '#00FFFF';
  };
  const mainColor = getRankColor(rank);

  const [{ scale, flashOpacity }, api] = useSpring(() => ({
    scale: 1,
    flashOpacity: 0,
    config: config.default,
  }));

  useEffect(() => {
    if (isFirst && isWinnerDetermined) {
      void api.start({
        to: async (next) => {
          // タメ → 静止 → インパクト → 余韻
          await next({ scale: 2.0, flashOpacity: 0, config: { tension: 150, friction: 12 } });
          await new Promise((resolve) => setTimeout(resolve, 300));
          await next({ scale: 1.05, flashOpacity: 1, config: { mass: 1, tension: 500, friction: 15 } });
          await next({ flashOpacity: 0, config: { duration: 500 } });
        },
      });
    } else if ((rank === 2 || rank === 3) && isWinnerDetermined) {
      void api.start({
        to: async (next) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          await next({ scale: 1.05, flashOpacity: 1, config: { tension: 300, friction: 10 } });
          await next({ scale: 1, flashOpacity: 0, config: { duration: 500 } });
        },
      });
    } else {
      void api.start({ scale: 1, flashOpacity: 0 });
    }
  }, [isFirst, rank, isWinnerDetermined, api]);

  const { number } = useSpring({
    from: { number: 0 },
    number: score,
    config: { mass: 1, tension: 20, friction: 10 },
  });

  const rawPercent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const { width } = useSpring({
    width: Math.min(Math.max(rawPercent, 0), 100),
    config: { tension: 120, friction: 14 },
  });

  return (
    <animated.div
      style={{
        ...style,
        width: 'auto',
        maxWidth: '100%',
        position: 'relative',
        transform: scale.to((s) => `scale(${s})`),
        zIndex: isFirst ? 1000 : 1,
      }}
    >
      <Box
        sx={{
          height: showWinnerStyle ? '140px' : '100px',
          marginTop: showWinnerStyle ? '16px' : '6px',
          marginBottom: showWinnerStyle ? '24px' : '6px',
          display: 'flex',
          alignItems: 'center',
          border: `2px solid ${showWinnerStyle ? '#FFF' : '#333'}`,
          borderLeft: `12px solid ${mainColor}`,
          background: showWinnerStyle ? 'linear-gradient(90deg, #332b00 0%, #000 100%)' : '#0a0a0a',
          boxShadow: showWinnerStyle ? `0 0 50px ${mainColor}` : '0 0 10px rgba(0,0,0,0.8)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.5s ease-out',
        }}
      >
        <animated.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#FFFFFF',
            opacity: flashOpacity,
            zIndex: 999,
            pointerEvents: 'none',
          }}
        />

        <animated.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: width.to((w) => `${w}%`),
            background: `linear-gradient(90deg, ${mainColor}22 0%, ${mainColor} 100%)`,
            zIndex: 0,
            opacity: 0.8,
            borderRight: '4px solid #FFF',
          }}
        />

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ width: '140px', flexShrink: 0, textAlign: 'left' }}>
            <Typography
              sx={{
                fontSize: showWinnerStyle ? '4rem' : '2rem',
                fontWeight: '900',
                color: mainColor,
                fontFamily: 'Impact, sans-serif',
                textShadow: showWinnerStyle ? '2px 2px 0 #000' : 'none',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                transition: 'font-size 0.5s ease',
              }}
            >
              {rank}
              <span style={{ fontSize: '1rem', marginLeft: '4px' }}>{ordinalSuffix(rank)}</span>
            </Typography>
          </Box>

          <Box
            sx={{
              width: showWinnerStyle ? '100px' : '70px',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'center',
              transition: 'width 0.5s ease',
            }}
          >
            <Box
              sx={{
                border: `2px solid ${showWinnerStyle ? '#FFF' : mainColor}`,
                boxShadow: `0 0 15px ${mainColor}`,
                lineHeight: 0,
                borderRadius: '4px',
              }}
            >
              <Avatar
                size={showWinnerStyle ? 80 : 48}
                name={`${id}:${name}`}
                variant="beam"
                square
                colors={['#000', mainColor, '#FFF', '#333', '#555']}
              />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, paddingLeft: '24px', minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: '900',
                fontFamily: '"Arial Black", sans-serif',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                fontSize: showWinnerStyle ? '2.5rem' : '1.5rem',
                textShadow: showWinnerStyle ? `0 0 20px ${mainColor}` : '2px 2px 0px #000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'font-size 0.5s ease',
              }}
            >
              {name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: mainColor, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}
            >
              TEAM_::{id}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
            <animated.span
              style={{
                fontSize: showWinnerStyle ? '5rem' : '3.5rem',
                fontWeight: 900,
                fontFamily: '"Roboto Mono", monospace',
                color: showWinnerStyle ? '#FFF' : '#EEE',
                textShadow: `0 0 ${showWinnerStyle ? '30px' : '10px'} ${mainColor}`,
              }}
            >
              {number.to((n) => Math.floor(n).toLocaleString())}
            </animated.span>
            <Typography
              variant="button"
              sx={{ display: 'inline-block', color: mainColor, marginLeft: '12px', fontSize: '1.2rem', fontWeight: '900' }}
            >
              PTS
            </Typography>
          </Box>
        </Box>
      </Box>
    </animated.div>
  );
}
