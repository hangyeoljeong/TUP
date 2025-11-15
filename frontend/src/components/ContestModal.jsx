import React, { useState, useEffect, useRef } from 'react';
import Modal from '@mui/material/Modal';
import CloseIcon from '@mui/icons-material/Close';
import SkillManager from './SkillManager';
import TeamList from './TeamList';
import FeedbackModal from './FeedbackModal';
import { calculateDday } from '../utils/dateUtils';
import GroupsIcon from '@mui/icons-material/Groups';
import { toast } from 'react-toastify';
import {
  saveUserInput,
  getWaitingUsers,
  applyTeamup,
  getMatchedTeams,
  applyTeamRematch,
  performFeedbackAction,
} from '../api/teamup1';

const ContestModal = ({
  open,
  onClose,
  selectedContest,
  users,
  setUsers,
  userSkills,
  setUserSkills,
  currentUser,
}) => {
  const [mainRole, setMainRole] = useState('');
  const [subRole, setSubRole] = useState('');
  const [matched, setMatched] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [rawTeams, setRawTeams] = useState([]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [hasReward, setHasReward] = useState(false); // ✅ 리워드 사용 여부
  const [isSaved, setIsSaved] = useState(false);

  const hasShownToast = useRef(false);
  const formRef = useRef(null);
  const queueRef = useRef(null);

  // ✅ 로컬 저장된 입력 복원
  useEffect(() => {
    const saved = localStorage.getItem('userInput');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserSkills(parsed.keywords || parsed.skills || []);
        setMainRole(parsed.mainRole || '');
        setSubRole(parsed.subRole || '');
        setHasReward(parsed.hasReward || false);
        console.log('💾 이전 입력 복원됨:', parsed);
      } catch (err) {
        console.error('❌ 저장된 입력 복원 실패:', err);
      }
    }
  }, []);

  const scrollToBoth = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [isHovered, setIsHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);
  const [isFeedbackHovered, setIsFeedbackHovered] = useState(false);
  const [isTeamroomHovered, setIsTeamroomHovered] = useState(false);

  // ✅ 입력 안내
  useEffect(() => {
    const alreadySaved = users.some((u) => u.id === currentUser?.id);
    const inputComplete =
      userSkills.length > 0 && mainRole.trim() !== "" && subRole.trim() !== "";

    if (open && !hasShownToast.current && !alreadySaved && !inputComplete) {
      hasShownToast.current = true;
    }
  }, [open, users, currentUser, userSkills, mainRole, subRole]);

  // ✅ 팀 목록 불러오기
  useEffect(() => {
    if (!open || !selectedContest?.id) return;
    (async () => {
      try {
        const list = await getMatchedTeams();
        if (Array.isArray(list)) {
          setRawTeams(list);
          const hydrate = (members) =>
            members.map((m) => {
              const u = users.find((u) => u.id === m.id);
              return {
                id: m.id,
                name: m.name || u?.name || `User ${m.id}`,
                mainRole: m.mainRole || m.main_role || u?.mainRole || '',
                subRole: m.subRole || m.sub_role || u?.subRole || '',
                skills: m.skills || u?.skills || [],
                keywords: [...(m.keywords || u?.keywords || [])],
                rating: m.rating ?? u?.rating,
                participation: m.participation ?? u?.participation,
                hasReward: m.hasReward ?? u?.hasReward ?? false,
              };
            });
          setMatched(list.map((t) => hydrate(t.members)));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open, selectedContest?.id]);

  // ✅ 내 팀 자동 추적
  useEffect(() => {
    if (!matched || !currentUser) return;
    const found = matched.find((team) =>
      team.some((m) => m.id === currentUser?.id)
    );
    if (found && JSON.stringify(found) !== JSON.stringify(myTeam)) {
      setMyTeam(found);
      console.log('🌀 useEffect 기반 myTeam 갱신');
    }
  }, [JSON.stringify(matched), currentUser?.id]);

  const isMatched = !!myTeam;

  // ✅ 최신 팀 및 대기열 동기화
  const refreshTeams = async () => {
    try {
      const [teamsRes, waitingRes] = await Promise.all([
        getMatchedTeams(),
        getWaitingUsers(),
      ]);

      const updatedTeams = Array.isArray(teamsRes?.data)
        ? teamsRes.data
        : teamsRes;
      const waitingUsersData =
        waitingRes?.data?.waiting_users || waitingRes?.waiting_users || [];

      const hydrate = (members) =>
        members.map((m) => {
          const u = users.find((u) => u.id === m.id);
          return {
            id: m.id,
            name: m.name || u?.name || `User ${m.id}`,
            mainRole: m.mainRole || u?.mainRole || '',
            subRole: m.subRole || u?.subRole || '',
            skills: [...(m.skills || u?.skills || [])],
            keywords: [...(m.keywords || u?.keywords || [])],
            rating: m.rating ?? u?.rating,
            participation: m.participation ?? u?.participation,
            hasReward: m.hasReward ?? u?.hasReward ?? false,
          };
        });

      const newTeams = updatedTeams.map((t) => ({
        ...t,
        members: hydrate(t.members || []),
      }));

      setRawTeams([...newTeams]);
      setMatched(newTeams.map((t) => [...t.members]));
      setUsers([...waitingUsersData]);

      const newMyTeam = newTeams.find((t) =>
        t.members.some((m) => m.id === currentUser?.id)
      );
      setMyTeam(newMyTeam || null);
    } catch (err) {
      console.error('❌ refreshTeams 실패:', err);
    }
  };

  // ✅ 저장 버튼
  const handleSave = async () => {
    if (isMatched) {
      toast.warning('이미 팀에 속해 있어 수정할 수 없습니다.');
      return;
    }

    if (userSkills.length === 0 || !mainRole.trim() || !subRole.trim()) {
      toast.warning('모든 필드를 입력해야 합니다.');
      return;
    }

    const newUser = {
      id: currentUser.id,
      name: currentUser.name || '나',
      keywords: userSkills,
      skills: [],
      mainRole,
      subRole,
      hasReward,
    };

    try {
      const res = await saveUserInput({
        userId: newUser.id,
        keywords: newUser.keywords,
        skills: newUser.skills,
        mainRole: newUser.mainRole,
        subRole: newUser.subRole,
        hasReward: newUser.hasReward,
      });

      if (res?.message) {
        localStorage.setItem(
          'userInput',
          JSON.stringify({
            keywords: userSkills,
            mainRole,
            subRole,
            hasReward,
          })
        );

        setUsers((prev) => [...prev.filter((u) => u.id !== newUser.id), newUser]);
        toast.success('저장 완료!');
        setIsSaved(true);
        await refreshTeams();
      }
    } catch (e) {
      toast.error('네트워크 오류');
    }
  };

  // ✅ 팀 매칭
  const [loadingMatch, setLoadingMatch] = useState(false);

  const matchTeam = async () => {
    if (users.length < 4) {
      toast.info('대기 인원이 부족해요! 팀업을 기다려주세요 😊');
      return;
    }

    try {
      setLoadingMatch(true);

      // 🎯 리워드가 없는 경우 → 일부러 2.5초 지연
      if (!hasReward) {
        console.log("⏳ 일반 매칭 대기 중...");
        await new Promise((resolve) => setTimeout(resolve, 4000));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        console.log("⚡ 리워드 우선 매칭 즉시 실행!");
      }

      // 실제 매칭 요청
      const res = await applyTeamup(currentUser.id);
      toast.success(res?.message || '팀 매칭 완료!');
      await refreshTeams();
    } catch (e) {
      toast.error('매칭 중 오류');
    } finally {
      setLoadingMatch(false);
    }
  };

  if (!selectedContest) return null;

  const { title, image, category, deadline, start, organizer } = selectedContest;
  const rawMyTeam = rawTeams.find(
    (t) => Array.isArray(t.members) && t.members.some((m) => m.id === currentUser?.id)
  );
  const teamIdForModal = rawMyTeam?.teamId || null;

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <div style={{ width: '100vw', height: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
          {/* 닫기 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
              <CloseIcon />
            </button>
          </div>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 2rem 2rem 2rem', gap: '2rem' }}>
            {/* ===== 왼쪽 입력 ===== */}
            <div style={{ width: '40%', overflowY: 'auto' }}>
              <img src={image} alt="공모전" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
              <h2 style={{ fontFamily: "'Montserrat', 'Noto Sans KR'", fontWeight: 800 }}>{title}</h2>
              <div style={{ background: '#F8F9FA', padding: '1rem', borderRadius: '8px' }}>
                <p>• 주최: {organizer}</p>
                <p>• 일정: {start} ~ {deadline}</p>
                <p>• 마감: {calculateDday(deadline)}</p>
                <p>• 분야: {category}</p>
              </div>

              <div ref={formRef} style={{ marginTop: '1rem' }}>
                <SkillManager
                  skills={userSkills}
                  setSkills={setUserSkills}
                  mainRole={mainRole}
                  setMainRole={setMainRole}
                  subRole={subRole}
                  setSubRole={setSubRole}
                  disabled={isMatched}
                />

                {/* ✅ 리워드 사용 체크박스 추가 */}
                <div style={{ marginTop: '1.2rem', background: '#FFF9F7', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👑 리워드 사용
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={hasReward}
                      disabled={!currentUser?.hasReward || isMatched}
                      onChange={(e) => setHasReward(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#FF6B35',
                        cursor: currentUser?.hasReward ? 'pointer' : 'not-allowed',
                      }}
                    />
                    <span style={{ color: currentUser?.hasReward ? '#000' : '#999', fontSize: '0.95rem' }}>
                      {currentUser?.hasReward
                        ? '리워드를 사용할 수 있습니다 😁'
                        : '리워드가 없습니다 🥲'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isMatched || isSaved}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: isMatched ? '#ccc' : isHovered ? '#ff824e' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginTop: '1.5rem',
                    fontFamily: "'Montserrat', 'Noto Sans KR'",
                    cursor: isMatched ? 'not-allowed' : 'pointer',
                    boxShadow: isMatched ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease-in-out',
                    transform: isHovered && !isMatched ? 'translateY(-1px)' : 'translateY(0)',
                  }}
                >
                  Save!
                </button>
              </div>
            </div>

            {/* ===== 오른쪽: 대기열 및 팀 ===== */}
            <div style={{ width: '60%', overflowY: 'auto' }}>
              <h2 style={{ color: '#FF6B35', fontFamily: "'Montserrat', 'Noto Sans KR'", fontWeight: 800 }}>
                <GroupsIcon style={{ marginRight: '0.5rem' }} />
                함께하자 팀으로!
              </h2>

              <div
                ref={queueRef}
                style={{
                  listStyle: 'none',
                  padding: 0,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '1rem',
                  background: '#FFF9F7',
                  borderRadius: '8px',
                  paddingInline: '1rem',
                }}
              >
                {users.length > 0 ? (
                  users.map((user) => (
                    <li key={user.id} style={{ display: 'flex', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid #eee', fontWeight: 500, fontSize: '1rem', color: '#333' }}>
                      👤 {user.name}
                      {user.hasReward && <span style={{ marginLeft: '6px', color: '#FFB800' }}>👑</span>}
                    </li>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#888', padding: '1rem 0', fontSize: '0.95rem' }}>
                    🔄 대기열 데이터를 불러오는 중이거나, 현재 표시할 유저가 없습니다.
                  </p>
                )}
              </div>

              {!myTeam ? (
                <button
                  onClick={matchTeam}
                  disabled={loadingMatch}
                  onMouseEnter={() => setIsTeamHovered(true)}
                  onMouseLeave={() => setIsTeamHovered(false)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: loadingMatch
                      ? '#ccc'
                      : isTeamHovered
                      ? '#ff824e'
                      : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: loadingMatch ? 'not-allowed' : 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                    fontFamily: "'Montserrat', 'Noto Sans KR'",
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease-in-out',
                    transform: isTeamHovered && !loadingMatch ? 'translateY(-1px)' : 'translateY(0)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {loadingMatch ? (
                    hasReward ? (
                      <>⚡ 리워드 매칭 중...</>
                    ) : (
                      <>⏳ 일반 매칭 중...</>
                    )
                  ) : (
                    <>
                      <GroupsIcon style={{ marginRight: '0.5rem' }} />
                      TEAM UP!
                    </>
                  )}
                </button>
              ) : (
                <p
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#FFF3ED',
                    color: '#FF6B35',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '1rem',
                    border: '1px solid #FF6B35',
                  }}
                >
                  이미 팀에 속해 있어요! 결과를 기다려주세요 😊
                </p>
              )}

              {matched.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <TeamList
                  matched={matched}
                  feedbacks={feedbacks}
                  currentUser={currentUser}
                  onFeedback={async (memberId, symbol) => {
                    console.log("💬 피드백 클릭됨:", memberId, symbol);

                    const rawMyTeam = rawTeams.find(
                      (t) => Array.isArray(t.members) && t.members.some((m) => m.id === currentUser?.id)
                    );
                    const teamId = rawMyTeam?.teamId || rawMyTeam?.team_id;

                    if (!teamId) {
                      toast.error("팀 ID를 찾을 수 없습니다.");
                      return;
                    }

                    try {
                      const res = await performFeedbackAction({
                        action: 'feedback',
                        teamId,
                        userId: memberId,
                        agree: symbol === '👍',
                      });

                      console.log('✅ 피드백 전송 성공:', res);
                      setFeedbacks((prev) => ({ ...prev, [memberId]: symbol }));
                    } catch (err) {
                      console.error('❌ 피드백 실패:', err);
                      toast.error('피드백 전송 중 오류 발생');
                    }
                  }}
                />

                  {/* ✅ 하단 두 버튼 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem', paddingBottom: '1rem' }}>
                    <button
                      onMouseEnter={() => setIsFeedbackHovered(true)}
                      onMouseLeave={() => setIsFeedbackHovered(false)}
                      onClick={() => setIsFeedbackModalOpen(true)}
                      style={{
                        flex: 1,
                        padding: '0.9rem',
                        backgroundColor: isFeedbackHovered ? '#ff824e' : '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        fontFamily: "'Montserrat', 'Noto Sans KR'",
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease, transform 0.2s ease',
                        transform: isFeedbackHovered ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                    >
                      피드백 결과 확인하기
                    </button>

                    <button
                      onMouseEnter={() => setIsTeamroomHovered(true)}
                      onMouseLeave={() => setIsTeamroomHovered(false)}
                      onClick={() => window.open('/TeamPage', '_blank')}
                      style={{
                        flex: 1,
                        padding: '0.9rem',
                        backgroundColor: isTeamroomHovered ? '#ff824e' : '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        fontFamily: "'Montserrat', 'Noto Sans KR'",
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease, transform 0.2s ease',
                        transform: isTeamroomHovered ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                    >
                      팀룸으로 이동하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {isFeedbackModalOpen && (
        <FeedbackModal
          open={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          team={myTeam || []}
          feedbacks={feedbacks}
          currentUser={currentUser}
          scrollToBoth={scrollToBoth}
          teamId={teamIdForModal}
          users={users}
          refreshTeams={refreshTeams}
        />
      )}
    </>
  );
};

export default ContestModal;