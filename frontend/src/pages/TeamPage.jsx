import React, { useEffect, useState } from 'react';
import './TeamPage.css';
import MenuIcon from '@mui/icons-material/Menu';
import DrawerMenu from '../components/DrawerMenu';
import ChatRoomMock from './ChatRoomMock';

function TeamPage() {
  const [teamData, setTeamData] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('currentTeam');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTeamData(parsed);
      } catch (err) {
        console.error('❌ 팀 데이터 파싱 오류:', err);
      }
    }
  }, []);

  if (!teamData || !teamData.members) {
    return (
      <div className="team-page-container">
        <h2>🚀 아직 팀 데이터가 없습니다</h2>
        <p>피드백 완료 후 팀룸으로 이동하면 여기에 팀원이 표시됩니다.</p>
      </div>
    );
  }

  const { members } = teamData;

  return (
    <div className="team-matching-container">
      <header className="team-matching-header">
        <span className="logo">TUP!</span>
        <button className="menu-button" onClick={() => setDrawerOpen(true)}>
          <MenuIcon style={{ fontSize: '2.2rem', color: '#FF6B35' }} />
        </button>
      </header>

      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        openMenus={openMenus}
        onToggle={setOpenMenus}
      />

      <div className="team-page-container">
        {/* 상단 헤더 */}
        <header className="team-header">
          <h1>
            🤝 나의 <span style={{ color: '#FF6B35' }}>팀 프로젝트</span> 공간
          </h1>
          <p>진행 중인 팀 프로젝트 정보를 한눈에 확인하고 팀원들과 협업해보세요</p>
        </header>

        {/* 팀원 소개 */}
        <section className="team-section">
          <h2>👥 팀원 소개</h2>
          <div className="team-grid">
            {members.map((member) => (
              <div key={member.id} className="member-card">
                <h3>{member.name}</h3>
                <p><strong>희망 역할군:</strong> {member.mainRole || '없음'}</p>
                <p><strong>보조 가능 역할군:</strong> {member.subRole || '없음'}</p>
                <p><strong>키워드:</strong> {member.keywords?.join(', ') || '없음'}</p>
                <p><strong>참여 이력:</strong> {member.participation || 0}회</p>
                <p><strong>평점:</strong> ⭐ {member.rating?.toFixed(1) || 0}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 일정관리 + 게시판 (2열) */}
        <div className="feature-grid">
          <section className="team-section feature-box">
            <h2>📅 일정 관리</h2>
            <p>공유 캘린더 기능이 이곳에 구현될 예정입니다.</p>
            <img src="/calendar.png" alt="일정관리 예시" className="feature-image" />
          </section>

          <section className="team-section feature-box">
            <h2>📒 팀 게시판</h2>
            <p>업무, 공지사항, 회의록을 공유하는 공간입니다.</p>
            <img src="/board.png" alt="팀 게시판 예시" className="feature-image" />
          </section>
        </div>

        {/* 채팅방 */}
        <section className="chat-image-section">
          <h2>💬 팀 채팅</h2>
          <p>실시간 채팅 기능이 구현될 예정입니다.</p>
          <ChatRoomMock />
        </section>
      </div>
    </div>
  );
}

export default TeamPage;