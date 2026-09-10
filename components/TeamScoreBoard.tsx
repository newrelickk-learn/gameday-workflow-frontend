'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { animated, useSpringRef, useTransition } from 'react-spring';
import TeamScoreRow from './TeamScoreRow';
import { teamNameFromSlot } from '@/lib/utils/team-progress';
import {
  ROW_HEIGHT,
  cumulativeScoreUpTo,
  withRanks,
  type DisplayTeam,
} from '@/lib/utils/team-score';
import type { TeamScoreResponse } from '@/lib/api/types';

const POLL_INTERVAL_MS = 5000;
// 総括の演出タイミング。加点 → 少し置いて並び替え → さらに置いて1位確定、の順に見せる。
const SCORE_COUNT_UP_DELAY_MS = 500;
const REORDER_DELAY_MS = 2000;
const WINNER_REVEAL_DELAY_MS = 1000;

const EMPTY_RESPONSE: TeamScoreResponse = { totalChapters: 0, maxScore: 0, chapters: [], teams: [] };

export default function TeamScoreBoard() {
  const [data, setData] = useState<TeamScoreResponse>(EMPTY_RESPONSE);
  const [teams, setTeams] = useState<DisplayTeam[]>([]);
  const [isWinnerDetermined, setIsWinnerDetermined] = useState(false);
  // null = ライブ表示(最新スコアをポーリング)、数値 = そのチャプターまでの累計を再生中
  const [revealedChapter, setRevealedChapter] = useState<number | null>(null);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const transRef = useSpringRef();

  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const later = (fn: () => void, delayMs: number) => {
    timeoutsRef.current.push(setTimeout(fn, delayMs));
  };

  const transitions = useTransition<ReturnType<typeof withRanks>[number], object>(
    withRanks(teams, isWinnerDetermined),
    {
      ref: transRef,
      keys: (team) => team.id,
      from: { position: 'absolute', opacity: 0 },
      leave: { height: 0, opacity: 0 },
      enter: ({ y }: { y: number }) => ({ y, opacity: 1 }),
      update: ({ y }: { y: number }) => ({ y }),
    }
  );

  useEffect(() => {
    Promise.all(transRef.start()).catch((e) => {
      console.error(e);
    });
  }, [teams, isWinnerDetermined, transRef]);

  // ライブ表示中だけポーリングする。総括の再生中に最新値で上書きされないようにするため。
  useEffect(() => {
    let mounted = true;

    const fetchScores = () => {
      fetch('/api/team-scores')
        .then((res) => res.json())
        .then((fetched: TeamScoreResponse) => {
          if (!mounted) return;
          setData(fetched);
          if (revealedChapter !== null) return;

          const highest = Math.max(0, ...(fetched.teams || []).map((t) => t.totalScore));
          setTeams(
            (fetched.teams || []).map((team) => ({
              id: team.companyId,
              score: team.totalScore,
              sortingScore: team.totalScore,
              maxScore: highest,
            }))
          );
        })
        .catch(() => {
          // ポーリング失敗時は直前の表示を維持する
        });
    };

    fetchScores();
    if (revealedChapter !== null) {
      return () => {
        mounted = false;
      };
    }

    const interval = setInterval(fetchScores, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [revealedChapter]);

  useEffect(() => clearPendingTimeouts, []);

  const handleRevealChapter = useCallback(
    (chapter: number) => {
      clearPendingTimeouts();
      setIsWinnerDetermined(false);
      setRevealedChapter(chapter);

      const staged = (data.teams || []).map((team) => ({
        id: team.companyId,
        pastScore: cumulativeScoreUpTo(team.chapters, chapter - 1),
        newScore: cumulativeScoreUpTo(team.chapters, chapter),
      }));

      const highest = Math.max(0, ...staged.map((t) => t.newScore));

      // まず「1つ前のチャプターまで」の状態を表示する
      setTeams(
        staged.map((team) => ({
          id: team.id,
          score: team.pastScore,
          sortingScore: team.pastScore,
          maxScore: highest,
        }))
      );

      later(() => {
        // 順位はそのままにスコアだけカウントアップさせる
        setTeams(
          staged.map((team) => ({
            id: team.id,
            score: team.newScore,
            sortingScore: team.pastScore,
            maxScore: highest,
          }))
        );

        later(() => {
          // 遅れて並び替える
          setTeams(
            staged.map((team) => ({
              id: team.id,
              score: team.newScore,
              sortingScore: team.newScore,
              maxScore: highest,
            }))
          );

          const isFinalChapter = chapter === (data.chapters?.[data.chapters.length - 1]?.chapter ?? chapter);
          if (isFinalChapter) {
            // 並び替えが落ち着いてから優勝確定の演出に入る
            later(() => setIsWinnerDetermined(true), WINNER_REVEAL_DELAY_MS);
          }
        }, REORDER_DELAY_MS);
      }, SCORE_COUNT_UP_DELAY_MS);
    },
    [data]
  );

  const handleBackToLive = useCallback(() => {
    clearPendingTimeouts();
    setIsWinnerDetermined(false);
    setRevealedChapter(null);
  }, []);

  return (
    <>
      <style>{'body { background-color: #000000 !important; overflow-x: hidden; }'}</style>

      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#FFFFFF',
          padding: '20px',
          fontFamily: '"Arial Black", sans-serif',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ maxWidth: '1600px', margin: '0 auto' }}>
          <Box
            sx={{
              borderBottom: '4px solid #333',
              paddingBottom: '16px',
              marginBottom: '40px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 14, color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>
                {revealedChapter !== null
                  ? `CHAPTER ${revealedChapter} まで`
                  : `LIVE / 全${data.totalChapters}クエスト`}
              </Typography>
              <Typography
                variant="h2"
                sx={{ fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '-2px' }}
              >
                LEADERBOARD
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: 32, color: '#FFF', fontWeight: '900' }}>New Relic GameDay</Typography>
            </Box>
          </Box>

          <Box sx={{ marginBottom: '40px', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              onClick={handleBackToLive}
              sx={{
                minWidth: '120px',
                height: '60px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: '4px',
                color: revealedChapter === null ? '#000' : '#AAA',
                backgroundColor: revealedChapter === null ? '#00FFFF' : '#222',
                '&:hover': { backgroundColor: revealedChapter === null ? '#00DDDD' : '#333' },
              }}
            >
              LIVE
            </Button>
            {data.chapters.map((chapter) => (
              <Button
                key={`chapter-${chapter.chapter}`}
                onClick={() => handleRevealChapter(chapter.chapter)}
                sx={{
                  minWidth: '150px',
                  height: '60px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  color: revealedChapter === chapter.chapter ? '#000' : '#000',
                  backgroundColor: revealedChapter === chapter.chapter ? '#FFF04D' : '#FFF',
                  '&:hover': { backgroundColor: '#DDD' },
                }}
              >
                CHAPTER {chapter.chapter}
              </Button>
            ))}
          </Box>

          {teams.length === 0 ? (
            <Typography sx={{ color: '#888', fontSize: '1.5rem', fontWeight: 'bold' }}>
              まだスコアのあるチームがありません。
            </Typography>
          ) : (
            <Box sx={{ position: 'relative', height: Math.max(teams.length * ROW_HEIGHT + 100, 300), width: '100%' }}>
              {transitions((style, item) => (
                <animated.div
                  key={item.id}
                  style={{ ...style, width: '100%', zIndex: item.rank === 1 ? 1000 : 10 }}
                >
                  <TeamScoreRow
                    id={item.id}
                    name={teamNameFromSlot(Number(item.id))}
                    score={item.score}
                    maxScore={item.maxScore}
                    rank={item.rank}
                    isWinnerDetermined={isWinnerDetermined}
                  />
                </animated.div>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
