import { Routes, Route, useParams, Link } from 'react-router-dom';
import MarketingLayout from './marketing/Layout';
import Home from './marketing/Home';
import { Product, Channels as ChannelsPage, Pricing, Docs, AuthPage, HostedChat } from './marketing/Pages';
import { AppIndex, RequireAuth, WorkspaceShell } from './app/Shell';
import { WorkspaceHome, Usage, Members, WorkspaceSettings } from './app/Workspace';
import { WorkspaceInbox, AgentConversations } from './app/Inbox';
import AgentLayout from './app/agent/Layout';
import { Overview, Instructions, Knowledge, Tools, Escalation } from './app/agent/Build';
import Playbooks from './app/agent/Playbooks';
import { Channels, Webchat } from './app/agent/Deploy';
import { Analytics, Simulations, Logs, Versions } from './app/agent/Monitor';

function Hosted() { const { aid } = useParams(); return <HostedChat agentId={aid} />; }

function NotFound() {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4"><h1 className="text-4xl font-extrabold">Page not found</h1><Link to="/" className="btn btn-primary">Go home</Link></div>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<Home />} />
        <Route path="product" element={<Product />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="docs" element={<Docs />} />
      </Route>
      <Route path="login" element={<AuthPage mode="login" />} />
      <Route path="signup" element={<AuthPage mode="signup" />} />
      <Route path="chat/:aid" element={<Hosted />} />
      <Route path="app" element={<RequireAuth><AppIndex /></RequireAuth>} />
      <Route path="app/w/:wid" element={<RequireAuth><WorkspaceShell /></RequireAuth>}>
        <Route index element={<WorkspaceHome />} />
        <Route path="inbox" element={<WorkspaceInbox />} />
        <Route path="usage" element={<Usage />} />
        <Route path="members" element={<Members />} />
        <Route path="settings" element={<WorkspaceSettings />} />
      </Route>
      <Route path="app/w/:wid/agents/:aid" element={<RequireAuth><AgentLayout /></RequireAuth>}>
        <Route index element={<Overview />} />
        <Route path="instructions" element={<Instructions />} />
        <Route path="playbooks" element={<Playbooks />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="tools" element={<Tools />} />
        <Route path="escalation" element={<Escalation />} />
        <Route path="channels" element={<Channels />} />
        <Route path="webchat" element={<Webchat />} />
        <Route path="conversations" element={<AgentConversations />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="simulations" element={<Simulations />} />
        <Route path="logs" element={<Logs />} />
        <Route path="versions" element={<Versions />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
