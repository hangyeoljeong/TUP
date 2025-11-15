import React from 'react';
import Modal from '@mui/material/Modal';
import PersonIcon from '@mui/icons-material/Person';
import { performFeedbackAction } from '../api/teamup1';
import { useNavigate } from 'react-router-dom';

const FeedbackModal = ({ open, onClose, team, feedbacks, currentUser, scrollToBoth, teamId }) => {
  const navigate = useNavigate();
  const isUserInTeam =
    currentUser && team.some((member) => String(member.id) === String(currentUser.id));

  //console.log('✅ isUserInTeam 결과:', isUserInTeam);

  const isAllResponded = team.every((member) => feedbacks[member.id]);
  const numPending = team.filter((member) => !feedbacks[member.id]).length;
  const isTeamSuccess = team.every((member) => feedbacks[member.id] === '👍');
  const isUserInQueue = currentUser && team.some((member) => member.id === currentUser.id);
  const shouldShowSavePrompt = currentUser && !isUserInTeam && !isUserInQueue;

  return (
    <Modal open={open} onClose={onClose}>
      <div
        style={{
          width: '90%',
          maxWidth: '600px',
          margin: '5% auto',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            fontSize: '1.4rem',
            marginBottom: '1.2rem',
            color: '#FF6B35',
          }}
        >
          🧡 내 팀 피드백 현황
        </h2>

        {isUserInTeam ? (
          <>
            {/* 팀원 목록 */}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {team.map((member) => {
                const status = feedbacks[member.id];
                let statusText = '⏳ 대기 중';
                let statusColor = '#999';

                if (status === '👍') {
                  statusText = '👍 팀업!';
                  statusColor = '#2ECC71';
                } else if (status === '👎') {
                  statusText = '👎 다음에..';
                  statusColor = '#999';
                }

                return (
                  <li
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.7rem 0',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon style={{ marginRight: '0.5rem' }} />
                      <strong>{member.name}</strong>
                    </div>
                    <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>
                  </li>
                );
              })}
            </ul>

            {/* 상태 메시지 + 버튼 */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              {isAllResponded ? (
                <>
                  <p style={{ color: '#999', fontWeight: 400, marginBottom: '1rem' }}>
                    모든 팀원이 피드백을 완료했습니다!
                  </p>

                  {isTeamSuccess ? (
                    <>
                      <p style={{ color: '#2ECC71', fontWeight: 700 }}>
                        ✅ 모두의 의견이 반영된 팀이 생성되었어요
                      </p>
                      <button
                        style={primaryButtonStyle}
                        onClick={() => {
                          // ✅ 팀 데이터를 localStorage에 저장
                          localStorage.setItem(
                            'currentTeam',
                            JSON.stringify({ teamId, members: team })
                          );
                          console.log('💾 팀 데이터 저장 완료:', { teamId, team });

                          // ✅ 페이지 이동
                          navigate('/TeamPage');
                        }}
                      >
                        팀룸으로 이동하기
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ color: '#E74C3C', fontWeight: 700 }}>❌ 팀업에 실패했어요</p>

                      {/* ✅ 주체 유저의 피드백에 따라 단일 버튼만 표시 */}
                      {feedbacks[currentUser.id] === '👍' ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                          {/* 재매칭 시도하기 */}
                          <button
                            style={primaryButtonStyle}
                            onClick={async () => {
                              try {
                                const agreedUserIds = team
                                  .filter((m) => feedbacks[m.id] === '👍')
                                  .map((m) => m.id);

                                if (!teamId) return;
                                if (agreedUserIds.length === 0) return;

                                console.log('🚀 재매칭 요청:', { teamId, agreedUserIds });

                                await performFeedbackAction({
                                  action: 'rematch',
                                  teamId,
                                  agreedUserIds,
                                });

                                console.log('✅ 재매칭 요청 완료. 화면 갱신 시작');

                                // ✅ 화면 새로고침 방식으로 교체
                                setTimeout(() => {
                                  console.log('🔄 재매칭 완료 → 페이지 새로고침 실행!');
                                  window.location.reload();
                                }, 800);
                              } catch (err) {
                                console.error('❌ 재매칭 실패:', err);
                              }
                            }}
                          >
                            재매칭 시도하기
                          </button>

                          {/* 대기열 이동하기 */}
                          <button
                            style={{
                              ...primaryButtonStyle,
                              backgroundColor: '#888', // 회색 계열로 구분
                            }}
                            onClick={async () => {
                              try {
                                await performFeedbackAction({
                                  teamId,
                                  userId: currentUser?.id,
                                  action: 'requeue',
                                });
                                setTimeout(() => window.location.reload(), 800);
                                onClose();
                              } catch (err) {
                                console.error('대기열 이동 실패', err);
                              }
                            }}
                          >
                            대기열 이동하기
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            style={primaryButtonStyle}
                            onClick={async () => {
                              try {
                                await performFeedbackAction({
                                  teamId,
                                  userId: currentUser?.id,
                                  action: 'requeue',
                                });
                                setTimeout(() => window.location.reload(), 800);
                                onClose();
                              } catch (err) {
                                console.error('대기열 이동 실패', err);
                              }
                            }}
                          >                              
                             대기열 이동하기
                           </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p style={{ color: '#555', fontWeight: 400 }}>
                  ⏳ 아직 {numPending}명 피드백 대기 중입니다
                </p>
              )}
            </div>
          </>
        ) : shouldShowSavePrompt ? (
          <>
            <p
              style={{
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '1rem',
                color: '#555',
                fontWeight: 500,
              }}
            >
              먼저 Team Up을 진행해주세요!
            </p>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => scrollToBoth(), 100);
                }}
                style={primaryButtonStyle}
              >
                내 정보 저장 후 팀업하러 가기
              </button>
            </div>
          </>
        ) : null}

        {/* 닫기 버튼 */}
        <div style={{ textAlign: 'right', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.7rem 1.2rem',
              backgroundColor: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};

const primaryButtonStyle = {
  backgroundColor: '#FF6B35',
  color: 'white',
  padding: '0.8rem 1.5rem',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default FeedbackModal;
