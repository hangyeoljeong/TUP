// src/pages/TeamMatching1.jsx
import React, { useState, useEffect } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import DrawerMenu from '../components/DrawerMenu';
import ContestModal from '../components/ContestModal';
import { calculateDday } from '../utils/dateUtils';
import './TeamMatching1.css';
import {
  applyTeamup,
  getMatchedTeams,
  performFeedbackAction,
  getWaitingUsers, // ✅ 추가
} from '../api/teamup1';

// 공모전 목록 (그대로)
const contestList = [
  {
    id: 1,
    title: '2025 AWS x Codetree 프로그래밍 경진대회',
    description: '클라우드 환경에서의 문제 해결 프로그래밍',
    category: '프로그래밍, 클라우드',
    deadline: '2025-05-16',
    start: '2025-04-21',
    organizer: 'AWS / 코드트리',
    image: '/aws.png',
  },
  {
    id: 2,
    title: '제7회 서울교육 데이터 분석·활용 아이디어 공모전',
    description: '교육 데이터를 활용한 분석 및 시각화',
    category: '데이터/코딩',
    deadline: '2025-06-01',
    start: '2025-04-21',
    organizer: '서울특별시교육청',
    image: '/seoul.png',
  },
  {
    id: 3,
    title: '2025년 경기도서관 크리에이티브 시너지 공모전',
    description: '공공도서관 시스템 개선 아이디어 공모',
    category: 'IT기획/프로그래밍',
    deadline: '2025-06-30',
    start: '2025-04-09',
    organizer: '경기도 / 경기도서관',
    image: '/creative.png',
  },
  {
    id: 4,
    title: '2025 GH 공간복지 청년 공모전',
    description: '공간 기술 기반의 아이디어 및 프로토타입 공모',
    category: '공간IT/UX설계',
    deadline: '2025-06-29',
    start: '2025-06-02',
    organizer: '경기주택도시공사',
    image: '/gh.png',
  },
  {
    id: 5,
    title: '제6회 뉴스읽기 뉴스일기 공모전',
    description: '뉴스 데이터를 활용한 콘텐츠 기획',
    category: '미디어/코딩교육',
    deadline: '2025-07-31',
    start: '2025-04-07',
    organizer: '한국언론진흥재단',
    image: '/news.png',
  },
];

// 백엔드 응답 → UI에서 쓰는 형태로 정규화
// 백엔드 응답 → UI에서 쓰는 형태로 정규화
const normalizeUsers = (rows = []) =>
  rows.map((u) => ({
    id: Number(u.userId) || u.id,
    name: u.name || `사용자 ${u.userId}`,
    // ✅ snake_case 대응 (main_role → mainRole)
    mainRole: u.mainRole || u.main_role || '입력 없음',
    subRole: u.subRole || u.sub_role || '입력 없음',
    keywords: Array.isArray(u.keywords)
      ? u.keywords
      : typeof u.keywords === 'string'
      ? u.keywords.split(',')
      : [],
    skills: Array.isArray(u.skills)
      ? u.skills
      : typeof u.skills === 'string'
      ? u.skills.split(',')
      : [],
    rating:
      typeof u.rating === 'number'
        ? u.rating
        : parseFloat(u.rating) || 0,
    participation:
      typeof u.participation === 'number'
        ? u.participation
        : parseInt(u.participation || 0, 10),
    hasReward: Boolean(u.hasReward || u.has_reward),
  }));

function TeamMatching1() {
  const [currentUser, setCurrentUser] = useState({
  id: 99,
  name: '이명준',
  rating: 4.8,
  participation: 2,
  hasReward: false,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState(null);

  const [userSkills, setUserSkills] = useState([]); // (모달 입력)
  const [matchedUsers, setMatchedUsers] = useState([]); // [{teamId, members:[userId...], status}]
  const [feedbacks, setFeedbacks] = useState({});
  const [users, setUsers] = useState([]); // ✅ 대기열 (DB)
  const [loading, setLoading] = useState(true);
  const [waitingUsers, setWaitingUsers] = useState([]);

  // 1) 대기열 50명 로드
  useEffect(() => {
  const fetchWaitingUsers = async () => {
    try {
      
      const res = await getWaitingUsers();
      console.log('✅ 대기열 응답:', res);

      const data = res.data?.waiting_users || res.waiting_users || [];
      const normalized = normalizeUsers(data); // ✅ 변환 적용
      console.log("📦 정제된 데이터:", normalized);
      setWaitingUsers(normalized);
      setUsers(normalized);

      const me = normalized.find(u => u.id === currentUser.id);
      if (me) {
        setCurrentUser(prev => ({ ...prev, hasReward: me.hasReward }));
      }

    } catch (error) {
      console.error('❌ 대기열 불러오기 실패:', error);
    }
  };

  fetchWaitingUsers();
}, []);

// ✅ 상태 변경 후 렌더링되는지 추적
  useEffect(() => {
    console.log('🎯 상태 반영됨 waitingUsers:', waitingUsers.length);
  }, [waitingUsers]);

  // 2) 매칭된 팀 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const data = await getMatchedTeams();
        setMatchedUsers(data);
      } catch (e) {
        console.error('팀 목록 로드 실패:', e);
      }
    })();
  }, []);

  // 3) 피드백 제출
  const onFeedback = async (targetUserId, vote) => {
    const myTeam = matchedUsers.find(
      (t) => Array.isArray(t.members) && t.members.includes(currentUser.id)
    );
    const teamId = myTeam?.teamId;
    if (!teamId) return;

    // 이미 제출한 피드백이면 중복 방지
    if (feedbacks[currentUser.id]) return;

    try {
      await performFeedbackAction({
        action: 'feedback',
        teamId,
        userId: currentUser.id,   // ✅ 내가 누른 피드백이므로 currentUser.id 사용
        agree: vote === '👍',
      });
      setFeedbacks((prev) => ({ ...prev, [currentUser.id]: vote }));
    } catch (err) {
      console.error('피드백 제출 실패:', err);
    }
  };

  // 4) 팀 매칭 실행
  const [loadingMatch, setLoadingMatch] = useState(false);

  const handleMatchTeam = async () => {
    try {
      setLoadingMatch(true); // 로딩 시작

      if (!currentUser?.hasReward) {
        console.log("⏳ 일반 매칭 대기 중...");
        // 2.5초 지연 (일반 매칭일 때만)
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } else {
        console.log("⚡ 리워드 우선 매칭 시작!");
      }

      // Django API 호출
      const res = await applyTeamup(currentUser.id);

      if (res?.teamId || res?.data?.teams) {
        const teams = await getMatchedTeams();
        setMatchedUsers(teams);
        console.log("✅ 팀 매칭 완료:", teams);
      } else {
        console.warn("⚠️ 팀 매칭 결과 없음:", res);
      }
    } catch (e) {
      console.error("❌ 팀 매칭 오류:", e);
    } finally {
      setLoadingMatch(false); // 로딩 종료
    }
  };

  return (
    <div className="team-matching-container">
      {/* 헤더 */}
      <header className="team-matching-header">
        <span className="logo">TUP!</span>
        {!drawerOpen && (
          <button
            className="menu-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="메뉴 열기"
          >
            <MenuIcon style={{ fontSize: '2.2rem', color: '#FF6B35' }} />
          </button>
        )}
      </header>

      {/* 드로어 메뉴 */}
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        openMenus={openMenus}
        onToggle={setOpenMenus}
      />

      {/* 소개 문구 */}
      <div className="matching-intro">
        <h1>
          <span className="highlight">AutoTeamUp</span> - 빠르게 팀 결성하기
        </h1>
        <p>
          공모전을 선택한 참가자들이 랜덤으로 팀을 결성한 후, <strong>2차 피드백</strong>을 통해
          최종 팀을 확정하는 방식입니다
        </p>
      </div>

      {/* 공모전 카드 리스트 */}
      <section className="contest-list-section">
        <h3 className="contest-section-title">📢 공모전을 찾아 팀업 진행하기</h3>
        <div className="contest-grid">
          {contestList.map((contest) => (
            <div
              key={contest.id}
              className="hover-card"
              onClick={() => {
                setSelectedContest(contest);
                setModalOpen(true);
              }}
            >
              <img src={contest.image} alt="공모전" className="hover-image" />
              <div className="hover-details">
                <h3>{contest.title}</h3>
                <p>
                  마감: {contest.deadline} ({calculateDday(contest.deadline)})
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 모달 */}
      {selectedContest && (
        <ContestModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          selectedContest={selectedContest}
          users={users} // ✅ DB 대기열
          setUsers={setUsers} // (모달 내 저장 시 업데이트)
          userSkills={userSkills}
          setUserSkills={setUserSkills}
          matched={matchedUsers}
          matchTeam={handleMatchTeam}
          feedbacks={feedbacks}
          onFeedback={onFeedback} // ✅ submitFeedback 연동
          currentUser={currentUser}
          loading={loading}
        />
      )}
    </div>
  );
}

export default TeamMatching1;