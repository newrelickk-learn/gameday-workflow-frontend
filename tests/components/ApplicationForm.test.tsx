import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// テスト用のモックコンポーネント
function ApplicationForm() {
  return (
    <form>
      <label htmlFor="type">申請タイプ</label>
      <select id="type" name="type">
        <option value="">選択してください</option>
        <option value="vacation">有給休暇</option>
      </select>
    </form>
  );
}

describe('ApplicationForm', () => {
  it('申請フォームが正しく表示される', () => {
    render(<ApplicationForm />);
    expect(screen.getByLabelText('申請タイプ')).toBeInTheDocument();
  });
});

