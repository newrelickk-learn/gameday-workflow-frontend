import { teamRangeQuery, teamNameFromSlot } from '@/lib/utils/team-progress';

describe('teamRangeQuery', () => {
  it('レンジ未指定ならクエリを付けない(game-master側の既定に任せる)', () => {
    expect(teamRangeQuery()).toBe('');
    expect(teamRangeQuery(null, null)).toBe('');
    expect(teamRangeQuery('', '')).toBe('');
  });

  it('指定されたレンジをクエリにする', () => {
    expect(teamRangeQuery('51', '100')).toBe('?from=51&to=100');
  });

  it('片方だけの指定も通す', () => {
    expect(teamRangeQuery('51')).toBe('?from=51');
    expect(teamRangeQuery(undefined, '50')).toBe('?to=50');
  });
});

describe('teamNameFromSlot', () => {
  it('スロット番号どおりのチーム名を返す', () => {
    expect(teamNameFromSlot(1)).toBe('A');
    expect(teamNameFromSlot(26)).toBe('Z');
    expect(teamNameFromSlot(27)).toBe('AA');
    expect(teamNameFromSlot(51)).toBe('AY');
  });
});
