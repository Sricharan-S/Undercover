import { useState } from 'react';
import { Button } from '../components/Button';
import { EndGameButton } from '../components/EndGameButton';
import { useGameStore } from '../store/gameStore';

export function MrWhiteGuessScreen() {
  const mrwhite = useGameStore((s) => s.mrwhiteToGuess);
  const civilianWord = useGameStore((s) => s.civilianWord);
  const submit = useGameStore((s) => s.submitMrWhiteGuess);

  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState<null | { correct: boolean }>(null);

  function handleSubmit() {
    const ok = guess.trim().toLowerCase() === civilianWord.trim().toLowerCase();
    setRevealed({ correct: ok });
  }

  function handleContinue() {
    submit(revealed?.correct ?? false);
  }

  return (
    <div className="screen items-center">
      <div className="flex w-full items-start justify-between gap-2">
        <span className="w-9" />
        <div className="flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            You were ousted
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold">{mrwhite?.name}</h2>
          <p className="mt-1 text-sm text-ink-300">Mr. White's last chance</p>
        </div>
        <EndGameButton />
      </div>

      <div className="my-8 w-full">
        {!revealed ? (
          <>
            <p className="mb-3 text-center text-sm text-ink-200">
              Guess the Civilians' secret word. Correct = you win the entire game.
            </p>
            <input
              autoFocus
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type the civilian word..."
              className="input w-full text-center font-display text-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && guess.trim()) handleSubmit();
              }}
              maxLength={32}
            />
            <Button full onClick={handleSubmit} disabled={!guess.trim()} className="mt-3">
              Lock in guess
            </Button>
          </>
        ) : (
          <div
            className={`rounded-3xl border-2 p-6 text-center ${
              revealed.correct ? 'border-good bg-good/10' : 'border-danger bg-danger/10'
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-ink-300">
              {revealed.correct ? 'Correct!' : 'Wrong'}
            </div>
            <div className="mt-2 font-display text-4xl font-bold">
              {revealed.correct ? '🎉 Mr. White wins!' : 'No luck'}
            </div>
            <div className="mt-3 text-sm text-ink-200">
              You guessed <span className="font-bold">{guess}</span>
              <br />
              The word was <span className="font-bold">{civilianWord}</span>
            </div>
          </div>
        )}
      </div>

      {revealed && (
        <Button full onClick={handleContinue}>
          Continue
        </Button>
      )}
    </div>
  );
}
