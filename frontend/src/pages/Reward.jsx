import React, { useState } from 'react';
import './Reward.css';
import DrawerMenu from '../components/DrawerMenu';
import MenuIcon from '@mui/icons-material/Menu';
import RedeemIcon from '@mui/icons-material/Redeem';
import StarIcon from '@mui/icons-material/Star';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RateReviewIcon from '@mui/icons-material/RateReview';

function Reward() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [points, setPoints] = useState(7); // 💡 임시 포인트
  const [message, setMessage] = useState("");

  const rewards = [
    {
      id: 1,
      name: "🎫 AutoTeamUp 매칭 우선권",
      description: "대기 없이 빠른 팀 매칭이 가능해요",
      cost: 5,
      icon: <StarIcon style={{ color: '#FF6B35' }} />,
    },
    {
      id: 2,
      name: "📌 OpenTeamUp 상단 고정권",
      description: "팀장 / 팀원 리스트에서 24시간 최상단에 고정!",
      cost: 3,
      icon: <WorkspacePremiumIcon style={{ color: '#1E90FF' }} />,
    },
  ];

  const activityHistory = [
    { id: 1, text: "팀 프로젝트 종료 후 팀원 별점 평가 완료", point: 1 },
    { id: 2, text: "TUP! 플랫폼 리뷰 작성 완료", point: 1 },
    { id: 3, text: "공모전 수상 후기 공유", point: 1 },
    { id: 4, text: "팀룸 피드백 제출", point: 1 },
  ];

  const handleExchange = (reward) => {
    if (points >= reward.cost) {
      setPoints(prev => prev - reward.cost);
      setMessage(`✅ "${reward.name}" 리워드를 교환했어요!`);
    } else {
      setMessage("❌ 포인트가 부족해요. 활동을 통해 더 모아보세요!");
    }

    setTimeout(() => setMessage(""), 4000);
  };

  return (
    <div className="reward-page-container">
      <header className="reward-page-header">
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

      <div className="reward-main">
        <h1>🎁 나의 <span className="highlight">리워드 교환소</span></h1>
        <p>획득한 포인트로 원하는 혜택을 교환해보세요</p>

        <div className="point-box">
          <RedeemIcon style={{ fontSize: '2.4rem', color: '#FFD700' }} />
          <span>보유 포인트: <strong>{points} P</strong></span>
        </div>

        {message && <div className="reward-message">{message}</div>}

        <div className="reward-list">
          {rewards.map((reward) => (
            <div key={reward.id} className="reward-item">
              <div className="reward-icon">{reward.icon}</div>
              <div className="reward-info">
                <h3>{reward.name}</h3>
                <p>{reward.description}</p>
                <span className="reward-cost">🎯 {reward.cost} P</span>
              </div>
              <button
                className="exchange-button"
                onClick={() => handleExchange(reward)}
              >
                교환하기
              </button>
            </div>
          ))}
        </div>

        {/* 사용자 프로필 카드 */}
        <div className="profile-card">
          <h2>이명준 님</h2>
          <p><strong>TUP!</strong> 개발중</p>
          <p>기술 스택: <strong>React, Node.js</strong></p>
          <p>희망 역할군: <strong>PM</strong></p>
          <p>보조 가능 역할군: 프론트엔드 개발</p>
          <p>평점: ⭐ <strong>4.8</strong></p>
        </div>

        {/* 포인트 획득 내역 */}
        <div className="history-section">
          <h2>📜 포인트 획득 내역</h2>
          <ul>
            {activityHistory.map(item => (
              <li key={item.id}>
                <RateReviewIcon style={{ fontSize: '1.2rem', marginRight: '0.3rem', color: '#888' }} />
                {item.text}
                <span className="history-point">+{item.point}P</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Reward;
