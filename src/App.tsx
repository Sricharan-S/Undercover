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
import { OnlineLobbyScreen } from './screens/OnlineLobbyScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen';
import { VoiceVideoOverlay } from './screens/VoiceVideoOverlay';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);

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
    case 'onlinelobby':
      screen = <OnlineLobbyScreen />;
      break;
    case 'waitingroom':
      screen = <WaitingRoomScreen />;
      break;
    default:
      screen = <HomeScreen />;
  }

  const onlineGamePhases: typeof phase[] = ['pick', 'reveal', 'describe', 'vote', 'eliminationreveal', 'mrwhiteguess', 'result'];
  const showVoiceOverlay = mode === 'online' && onlineGamePhases.includes(phase);

  return (
    <>
      {screen}
      {phase === 'home' && <InstallPrompt />}
      {showVoiceOverlay && <VoiceVideoOverlay />}
    </>
  );
}
