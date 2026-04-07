import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useAppStore } from "./store";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import StatusBar from "./components/StatusBar";
import WelcomeScreen from "./components/WelcomeScreen";
import GitHubSetup from "./components/GitHubSetup";

function App() {
  const { vaultPath, githubSetupComplete } = useAppStore();

  if (!vaultPath) {
    return <WelcomeScreen />;
  }

  if (!githubSetupComplete) {
    return <GitHubSetup />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="w-1 bg-[#30363d] hover:bg-[#58a6ff] transition-colors" />
          <Panel defaultSize={80}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70}>
                <Editor />
              </Panel>
              <PanelResizeHandle className="h-1 bg-[#30363d] hover:bg-[#58a6ff] transition-colors" />
              <Panel defaultSize={30}>
                <Preview />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
