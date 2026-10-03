import { useMaillot } from './engine.js';
import Header from './components/Header.jsx';
import MobileNav from './components/MobileNav.jsx';
import Toast from './components/Toast.jsx';
import Modal from './components/Modal.jsx';
import Home from './views/Home.jsx';
import Browse from './views/Browse.jsx';
import Detail from './views/Detail.jsx';
import Sell from './views/Sell.jsx';
import Profile from './views/Profile.jsx';
import AddShirt from './views/AddShirt.jsx';
import VaultItemDetail from './views/VaultItemDetail.jsx';
import Admin from './views/Admin.jsx';
import PublicVault from './views/PublicVault.jsx';
import Auth from './views/Auth.jsx';

function App() {
  const { v } = useMaillot();

  if (v.isPublicVault) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0A0C0B',
          color: '#F2F4F1',
          fontFamily: "'Archivo',system-ui,sans-serif"
        }}
      >
        <PublicVault v={v} />
        <Toast v={v} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0C0B',
        color: '#F2F4F1',
        fontFamily: "'Archivo',system-ui,sans-serif",
        paddingBottom: v.padBottom
      }}
    >
      <Header v={v} />
      {v.isHome && <Home v={v} />}
      {v.isBrowse && <Browse v={v} />}
      {v.isDetail && <Detail v={v} />}
      {v.isSell && <Sell v={v} />}
      {v.isProfile && <Profile v={v} />}
      {v.isAdd && <AddShirt v={v} />}
      {v.isVaultItem && <VaultItemDetail v={v} />}
      {v.isAdmin && <Admin v={v} />}
      {v.isAuth && <Auth v={v} />}
      <MobileNav v={v} />
      <Modal v={v} />
      <Toast v={v} />
    </div>
  );
}

export default App;
