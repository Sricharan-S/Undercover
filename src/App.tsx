import { useGameStore } from './store/gameStore';
import { HomeScreen } from './screens/HomeScreen';
import { GroupsScreen } from './screens/GroupsScreen';
import { GroupEditorScreen } from './screens/GroupEditorScreen';
import { SetupScreen } from './screens/SetupScreen';
import { CardPickScreen } from './screens/CardPickScreen';
import { RevealScreen } from './screens/RevealScreen';
import { DescribeScreen } from './screens/DescribeScreen';
import { VoteScreen } from './screens/VoteScreen';
import { EliminationRevealScreen } from './screens/EliminationRevealScreen';
import { MrWhiteGuessScreen } from './screens/MrWhiteGuessScreen';
import { ResultScreen } from './screens/ResultScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { InstallPrompt } from './components/InstallPrompt';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  let screen: JSX.Element;
  switch (phase) {
    case 'home':
      screen = <HomeScreen />;
      break;
    case 'groups':
      screen = <GroupsScreen />;
      break;
    case 'groupeditor':
      screen = <GroupEditorScreen />;
      break;
    case 'setup':
      screen = <SetupScreen />;
      break;
    case 'pick':
      screen = <CardPickScreen />;
      break;
    case 'reveal':
      screen = <RevealScreen />;
      break;
    case 'describe':
      screen = <DescribeScreen />;
      break;
    case 'vote':
      screen = <VoteScreen />;
      break;
    case 'eliminationreveal':
      screen = <EliminationRevealScreen />;
      break;
    case 'mrwhiteguess':
      screen = <MrWhiteGuessScreen />;
      break;
    case 'result':
      screen = <ResultScreen />;
      break;
    case 'leaderboard':
      screen = <LeaderboardScreen />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <>
      {screen}
      {phase === 'home' && <InstallPrompt />}
    </>
  );
}
